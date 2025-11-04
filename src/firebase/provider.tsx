'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, DocumentSnapshot, DocumentData, FirestoreError } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import type { Collaborator } from '@/lib/types';
import { FirestorePermissionError } from './errors';
import { errorEmitter } from './error-emitter';

// Represents the combined user context: Auth user + Firestore profile
interface UserContext {
  user: User | null;
  collaborator: Collaborator | null;
  isLoading: boolean;
  error: Error | null;
}

// The complete state provided by the context
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  collaborator: Collaborator | null;
  isLoading: boolean; 
  error: Error | null;
}

/**
 * FirebaseProvider manages and provides Firebase services AND the complete user context (Auth + Profile).
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userContext, setUserContext] = useState<UserContext>({
    user: null,
    collaborator: null,
    isLoading: true, // Start loading immediately
    error: null,
  });

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth || !firestore) {
      setUserContext({ user: null, collaborator: null, isLoading: false, error: new Error("Auth or Firestore service not provided.") });
      return;
    }

    // This is the auth state listener.
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          // User is logged in, now we MUST fetch their profile.
          const profileRef = doc(firestore, 'collaborators', firebaseUser.uid);
          
          const unsubscribeProfile = onSnapshot(profileRef, 
            (snapshot: DocumentSnapshot<DocumentData>) => {
              if (snapshot.exists()) {
                // Profile found, context is fully loaded.
                setUserContext({ 
                  user: firebaseUser, 
                  collaborator: { ...snapshot.data(), id: snapshot.id } as Collaborator,
                  isLoading: false, 
                  error: null 
                });
              } else {
                // User exists in Auth, but not in Firestore. This is a valid, non-loading state.
                setUserContext({ user: firebaseUser, collaborator: null, isLoading: false, error: null });
              }
            },
            (profileError: FirestoreError) => {
               // A real error occurred trying to fetch the profile.
               console.error("FirebaseProvider: Profile snapshot error:", profileError);
               setUserContext({ user: firebaseUser, collaborator: null, isLoading: false, error: profileError });
            }
          );
          // Return a cleanup function that unsubscribes from the profile listener when the user logs out.
          return () => unsubscribeProfile();
        } else {
          // No user is logged in. The context is fully determined and not loading.
          setUserContext({ user: null, collaborator: null, isLoading: false, error: null });
        }
      },
      (authError) => { // Auth listener itself failed
        console.error("FirebaseProvider: onAuthStateChanged error:", authError);
        setUserContext({ user: null, collaborator: null, isLoading: false, error: authError });
      }
    );

    return () => unsubscribeAuth(); // Cleanup auth listener on provider unmount
  }, [auth, firestore]);

  // Memoize the final context value that will be exposed to consumers.
  const contextValue = useMemo((): FirebaseContextState => {
    return {
      firebaseApp: firebaseApp,
      firestore: firestore,
      auth: auth,
      user: userContext.user,
      collaborator: userContext.collaborator,
      isLoading: userContext.isLoading,
      error: userContext.error,
    };
  }, [firebaseApp, firestore, auth, userContext]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};


// --- HOOKS ---

// The context remains undefined initially.
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// Props for the provider component
interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

/**
 * Hook to access the entire Firebase context including services and the full user profile.
 */
export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  if (!auth) throw new Error("Auth service not available.");
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  if (!firestore) throw new Error("Firestore service not available.");
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
    const { firebaseApp } = useFirebase();
    if (!firebaseApp) throw new Error("FirebaseApp not available.");
    return firebaseApp;
};
