'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Important! initializeApp() can be called without arguments if Firebase Hosting
    // environment variables are set. We prioritize this for production environments.
    let firebaseApp;
    try {
      // Attempt to initialize using environment variables (standard for production).
      firebaseApp = initializeApp();
    } catch (e) {
      // Fallback to the config object, which is normal for local development.
      firebaseApp = initializeApp(firebaseConfig);
    }
    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs from the existing app instance.
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './auth/use-user';
export * from './errors';
export * from './error-emitter';
