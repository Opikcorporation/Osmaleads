'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { UserRecord } from 'firebase-admin/auth';
import { avatarColors, getRandomColor } from '@/lib/colors';

const RequestBodySchema = z.object({
  username: z.string().min(3, "Le nom d'utilisateur est trop court"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
  name: z.string().min(2, "Le nom est trop court"),
  role: z.enum(['admin', 'collaborator']),
  avatarColor: z.string().refine(color => avatarColors.includes(color)),
});

/**
 * API route pour créer un utilisateur dans Firebase Auth.
 * Le profil Firestore associé sera créé automatiquement par une Cloud Function.
 */
export async function POST(request: Request) {
  const { auth, firestore } = getFirebaseAdmin();
  
  try {
    const body = await request.json();
    const validation = RequestBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.formErrors }, { status: 400 });
    }
    
    const { username, password, name, role, avatarColor } = validation.data;
    const email = `${username}@example.com`;

    // 1. Créer l'utilisateur dans Firebase Auth
    let userRecord: UserRecord;
    try {
      userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: name,
      });
    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: "Ce nom d'utilisateur est déjà utilisé." }, { status: 409 });
        }
        // Pour les autres erreurs d'authentification (mot de passe faible, etc.)
        return NextResponse.json({ error: error.message || "Une erreur est survenue lors de la création du compte d'authentification." }, { status: 500 });
    }

    // 2. Créer le profil dans Firestore.
    // Cette étape est cruciale car la Cloud Function `onUserCreate` ne peut pas
    // recevoir de données supplémentaires comme le rôle ou le nom d'utilisateur.
    // Nous le faisons donc ici de manière atomique après la création de l'utilisateur.
    const userProfile = {
      id: userRecord.uid,
      name: name,
      username: username,
      email: email,
      role: role,
      avatarColor: avatarColor || getRandomColor(),
    };

    await firestore.collection('collaborators').doc(userRecord.uid).set(userProfile);

    // Retourner une réponse de succès
    return NextResponse.json({
      message: 'Utilisateur créé avec succès.',
      uid: userRecord.uid,
      profile: userProfile
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in /api/create-user:', error);
    return NextResponse.json({ error: 'Failed to execute user creation', details: error.message }, { status: 500 });
  }
}
