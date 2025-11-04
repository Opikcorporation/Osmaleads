'use client';

import { useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useUser, useDoc, useFirestore } from '@/firebase';
import type { Collaborator } from '@/lib/types';
import type { User } from 'firebase/auth';

export interface UserProfileHookResult {
  user: User | null;
  collaborator: Collaborator | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * A comprehensive hook to get both the Firebase Auth user and their Firestore collaborator profile.
 * It ensures that the profile is only fetched after the user is authenticated and manages a unified
 * loading and error state.
 *
 * @returns {UserProfileHookResult} An object containing the auth user, collaborator profile, loading state, and error.
 */
export const useUserProfile = (): UserProfileHookResult => {
  const firestore = useFirestore();
  const { user, isUserLoading, userError } = useUser();

  // Create a memoized reference to the user's document in Firestore.
  // This ref only becomes non-null once the user object is available.
  const collaboratorRef = useMemo(() => {
    if (user?.uid) {
      return doc(firestore, 'collaborators', user.uid);
    }
    return null;
  }, [user?.uid, firestore]);

  // Use the useDoc hook to fetch the collaborator profile data.
  // isProfileLoading will be true while the document is being fetched.
  const { data: collaborator, isLoading: isProfileLoading, error: profileError } = useDoc<Collaborator>(collaboratorRef);

  // The overall loading state is true if either auth is pending or the profile is being fetched.
  const isLoading = isUserLoading || (user && isProfileLoading);

  // Combine potential errors from auth and profile fetching.
  const error = userError || profileError;

  return { 
    user, 
    collaborator: collaborator, 
    isLoading, 
    error 
  };
};
