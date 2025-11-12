'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { UserRecord } from 'firebase-admin/auth';
import type { Auth } from 'firebase-admin/auth'; // CORRECTED IMPORT
import type { Firestore } from 'firebase-admin/firestore';


// --- SELF-CONTAINED COLOR LOGIC ---
const avatarColors = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981', 
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'
];

const getRandomColor = () => {
  return avatarColors[Math.floor(Math.random() * avatarColors.length)];
};
// --- END OF SELF-CONTAINED LOGIC ---

// The schema is now more flexible, making avatarColor optional.
const RequestBodySchema = z.object({
  name: z.string().min(2, "Le nom est trop court"),
  role: z.enum(['admin', 'collaborator']),
  avatarColor: z.string().optional(), // avatarColor is now optional
});

/**
 * Finds a unique username by appending a number if the base username is taken.
 */
async function findUniqueUsername(firestore: Firestore, baseUsername: string): Promise<string> {
    let username = baseUsername;
    let counter = 1;
    while (true) {
        const existingUserQuery = await firestore.collection('collaborators').where('username', '==', username).limit(1).get();
        if (existingUserQuery.empty) {
            return username; // The username is unique
        }
        // If not unique, append a number and try again
        username = `${baseUsername}${counter}`;
        counter++;
    }
}

/**
 * API route to create a user in Firebase Auth with automatically generated username and password.
 * The Firestore profile is also created.
 */
export async function POST(request: Request) {
  const { auth, firestore }: { auth: Auth, firestore: Firestore } = getFirebaseAdmin();
  
  try {
    const body = await request.json();
    const validation = RequestBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.flatten() }, { status: 400 });
    }
    
    // Server now handles the fallback logic for avatarColor robustly.
    const { name, role, avatarColor } = validation.data;
    const finalAvatarColor = avatarColor && avatarColors.includes(avatarColor) ? avatarColor : getRandomColor();

    // 1. --- Generate Username ---
    const baseUsername = name.toLowerCase().replace(/\s+/g, '_');
    const username = await findUniqueUsername(firestore, baseUsername);
    const email = `${username}@example.com`;

    // 2. --- Generate Password ---
    const firstName = name.split(' ')[0].toLowerCase();
    const password = `${firstName.substring(0, 3)}1234TERRASKY`;

    // 3. --- Create Auth User ---
    let userRecord: UserRecord;
    try {
      userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: name,
      });
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: "Ce nom d'utilisateur a généré un email qui existe déjà." }, { status: 409 });
        }
        return NextResponse.json({ error: error.message || "Une erreur est survenue lors de la création du compte d'authentification." }, { status: 500 });
    }

    // 4. --- Create Firestore Profile ---
    const userProfile = {
      id: userRecord.uid,
      name: name,
      username: username,
      email: email,
      role: role,
      avatarColor: finalAvatarColor,
    };

    await firestore.collection('collaborators').doc(userRecord.uid).set(userProfile);

    // Return a success response
    return NextResponse.json({
      message: 'Utilisateur créé avec succès.',
      uid: userRecord.uid,
      profile: userProfile,
      generatedPassword: password,
    }, { status: 201 });

  } catch (error: any) {
    // This global catch will handle any unexpected errors (like JSON parsing)
    // and ensure a proper JSON response is always sent.
    console.error('Error in /api/create-user:', error);
    return NextResponse.json({ error: 'Failed to execute user creation', details: error.message }, { status: 500 });
  }
}
