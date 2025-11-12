'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// This function ensures Firebase is initialized only once.
const getFirebaseApp = (): FirebaseApp => {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
};

const app = getFirebaseApp();
const authInstance = getAuth(app);
const firestoreInstance = getFirestore(app);

// This function is now simplified to just return the memoized instances.
// This prevents any re-initialization issues.
export function initializeFirebase() {
  return {
    firebaseApp: app,
    auth: authInstance,
    firestore: firestoreInstance,
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
