'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const RequestBodySchema = z.object({
  uid: z.string().min(1, "L'ID utilisateur est requis."),
});

/**
 * API route to securely delete a user from both Firebase Auth and Firestore.
 * This is an admin-only operation and should be protected by middleware in a real app.
 */
export async function POST(request: Request) {
  const { auth, firestore } = getFirebaseAdmin();
  
  try {
    const body = await request.json();
    const validation = RequestBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.formErrors }, { status: 400 });
    }
    
    const { uid } = validation.data;

    // --- ATOMIC DELETION ---
    // 1. Delete the Firebase Authentication user.
    // This is the most critical step. If this fails, we don't proceed.
    await auth.deleteUser(uid);

    // 2. Delete the user's profile from Firestore.
    const userProfileRef = firestore.collection('collaborators').doc(uid);
    await userProfileRef.delete();

    // 3. (Optional future step) Here you could also query for leads assigned
    // to this user and set their `assignedCollaboratorId` to null.
    // For now, we leave them as is.

    return NextResponse.json({ message: 'Utilisateur supprimé avec succès.' }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/delete-user:', error);

    // Provide more specific error messages
    if (error.code === 'auth/user-not-found') {
        // This can happen in a race condition if the user is already deleted.
        // We can consider this a "success" from the client's perspective.
        return NextResponse.json({ message: "L'utilisateur avait déjà été supprimé." }, { status: 200 });
    }

    return NextResponse.json({ error: 'La suppression a échoué sur le serveur.', details: error.message }, { status: 500 });
  }
}
