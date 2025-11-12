'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // This is the correct way to initialize.
    // We don't need a try/catch block because in a real Firebase Hosting env,
    // the config is provided automatically, and locally, we have the config object.
    const app = initializeApp(firebaseConfig);
    return getSdks(app);
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
export * from './auth/use-user-profile';
export * from './errors';
export * from './error-emitter';
