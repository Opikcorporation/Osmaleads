'use server';

import * as admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

interface FirebaseAdminServices {
  app: admin.App;
  firestore: Firestore;
  auth: Auth;
}

let services: FirebaseAdminServices | null = null;

/**
 * Initializes the Firebase Admin SDK and returns the services.
 * It ensures that initialization only happens once (singleton pattern).
 *
 * This function should only be called in a server-side context (e.g., Genkit flows).
 *
 * @returns {FirebaseAdminServices} An object containing the initialized app, firestore, and auth services.
 */
export function getFirebaseAdmin(): FirebaseAdminServices {
  if (services) {
    return services;
  }

  // Check if the app is already initialized
  if (admin.apps.length === 0) {
    // If not, initialize it.
    // The SDK will automatically use Google Application Default Credentials when projectId is provided.
    admin.initializeApp({
      projectId: process.env.GCLOUD_PROJECT,
    });
  }

  const app = admin.apps[0]!;
  const firestore = getFirestore(app);
  const auth = getAuth(app);

  services = { app, firestore, auth };

  return services;
}
