import * as admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { applicationDefault } from 'firebase-admin/app';

interface FirebaseAdminServices {
  app: admin.App;
  firestore: Firestore;
  auth: Auth;
}

// Use a singleton instance to prevent re-initialization
let services: FirebaseAdminServices | null = null;

/**
 * Initializes the Firebase Admin SDK and returns the services.
 * It ensures that initialization only happens once (singleton pattern).
 *
 * This function should only be called in a server-side context.
 *
 * @returns {FirebaseAdminServices} An object containing the initialized app, firestore, and auth services.
 */
export function getFirebaseAdmin(): FirebaseAdminServices {
  // If services are already initialized, return them immediately.
  if (services) {
    return services;
  }

  // Check if the app is already initialized by the Admin SDK.
  if (admin.apps.length === 0) {
    // If not, initialize it using Application Default Credentials.
    // This is the recommended way for server environments like Cloud Run.
    try {
      admin.initializeApp({
        credential: applicationDefault(),
        projectId: process.env.GCLOUD_PROJECT,
      });
    } catch (e) {
        console.error("Failed to initialize Firebase Admin SDK", e);
        // This catch is crucial to understand why initialization might fail.
        // It could be due to missing credentials or environment variables.
        throw new Error("Could not initialize Firebase Admin SDK. Check server logs for details.");
    }
  }

  const app = admin.apps[0]!;
  const firestore = getFirestore(app);
  const auth = getAuth(app);

  // Store the initialized services in the singleton instance.
  services = { app, firestore, auth };

  return services;
}
