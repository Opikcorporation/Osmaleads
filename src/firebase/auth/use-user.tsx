'use client';

import { useFirebase } from '@/firebase/provider';
import { User } from 'firebase/auth';

export interface UserAuthHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserAuthHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserAuthHookResult => {
  const { user, isLoading, error } = useFirebase(); // Leverages the main hook
  return { user, isUserLoading: isLoading, userError: error };
};

    