'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

const RequestBodySchema = z.object({
  uid: z.string().min(1, "L'ID utilisateur est requis."),
});

/**
 * API route to securely delete a user from both Firebase Auth and Firestore.
 * This route is resilient and will handle cases where the user might only exist
 * in Firestore (e.g., corrupted data) or only in Auth.
 */
export async function POST(request: Request) {
  const { auth, firestore }: { auth: Auth, firestore: Firestore } = getFirebaseAdmin();
  
  try {
    const body = await request.json();
    const validation = RequestBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.formErrors }, { status: 400 });
    }
    
    const { uid } = validation.data;

    // --- RESILIENT DELETION ---
    
    // 1. Attempt to delete the Firebase Authentication user.
    try {
      await auth.deleteUser(uid);
    } catch (error: any) {
      // If the user is not found in Auth, it's not a critical failure.
      // This allows us to clean up Firestore profiles for which an Auth user might not exist.
      // We log it on the server for debugging but don't stop the process.
      if (error.code !== 'auth/user-not-found') {
        // For any other auth error (e.g., permissions), we should fail hard.
        throw error;
      }
      console.log(`Auth user with UID ${uid} not found. Proceeding to delete Firestore profile.`);
    }

    // 2. Attempt to delete the user's profile from Firestore.
    const userProfileRef = firestore.collection('collaborators').doc(uid);
    const userProfileDoc = await userProfileRef.get();
    
    if (userProfileDoc.exists) {
        await userProfileRef.delete();
    } else {
        console.log(`Firestore profile with UID ${uid} not found. Already deleted or never existed.`);
    }

    // 3. (Optional future step) Here you could also query for leads assigned
    // to this user and set their `assignedCollaboratorId` to null.

    return NextResponse.json({ message: 'Utilisateur supprimé avec succès.' }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/delete-user:', error);
    // Provide a more generic but helpful server error message
    return NextResponse.json({ error: 'La suppression a échoué sur le serveur.', details: error.message }, { status: 500 });
  }
}
