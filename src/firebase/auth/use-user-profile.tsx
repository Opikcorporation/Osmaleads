'use client';

import { useFirebase } from '@/firebase/provider';
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
 * It leverages the central FirebaseProvider, which now manages the combined loading state.
 *
 * @returns {UserProfileHookResult} An object containing the auth user, collaborator profile, a unified loading state, and any error.
 */
export const useUserProfile = (): UserProfileHookResult => {
  // The useFirebase hook is now the single source of truth for all user-related data and loading states.
  const { user, collaborator, isLoading, error } = useFirebase();

  return { 
    user, 
    collaborator, 
    isLoading, 
    error 
  };
};
