'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Logo } from '@/components/logo';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // The root page's only job is to redirect to the login page.
    // The login page will then handle redirecting to the dashboard if the user is already authenticated.
    router.replace('/login');
  }, [router]);

  // Display a loading indicator while the redirection is happening
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Logo className="mx-auto h-12 w-12 animate-pulse text-foreground" />
        <p className="font-semibold">Chargement de l'application...</p>
      </div>
    </div>
  );
}
