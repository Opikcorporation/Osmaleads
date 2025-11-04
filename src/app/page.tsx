'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Logo } from '@/components/logo';

export default function HomePage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the auth state is determined
    if (isUserLoading) {
      return; // Do nothing while loading
    }

    if (user) {
      // If user is logged in, redirect to dashboard
      router.push('/dashboard');
    } else {
      // If no user is logged in, redirect to the login page
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Display a loading indicator while the logic runs
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Logo className="mx-auto h-12 w-12 animate-pulse text-foreground" />
        <p className="font-semibold">Chargement de l'application...</p>
      </div>
    </div>
  );
}
