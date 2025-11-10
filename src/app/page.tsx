'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';

export default function RootPage() {
  const { user, isLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, user, router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <p>Chargement...</p>
    </div>
  );
}
