'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true); // Start in loading state for auto-login attempt
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If a user is already logged in, redirect to dashboard
    if (user && !isUserLoading) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);


  useEffect(() => {
    // Only attempt auto-login if not loading user and not logged in yet
    if (!isUserLoading && !user) {
      const autoLogin = async () => {
        setIsLoading(true);
        setError(null);
        const email = `admin01@example.com`;
        const password = 'password123';

        try {
          await signInWithEmailAndPassword(auth, email, password);
          toast({
            title: 'Connexion automatique réussie',
            description: 'Bienvenue, Admin !',
          });
          // The other useEffect will handle the redirect
        } catch (err: any) {
          console.error('Auto-login Error:', err);
          let errorMessage = 'La connexion automatique a échoué. Veuillez réessayer.';
          if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            errorMessage = "Les identifiants automatiques sont incorrects ou le compte admin n'existe pas.";
          }
          setError(errorMessage);
          toast({
            variant: 'destructive',
            title: 'Erreur de connexion automatique',
            description: errorMessage,
          });
          setIsLoading(false);
        }
      };

      autoLogin();
    }
  }, [isUserLoading, user, auth, router, toast]);

  
  // Show a loading screen during auth check and login attempt.
  // Do not show the login form until we know auto-login has failed.
  if (isUserLoading || isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
            <Logo className="mx-auto h-12 w-12 animate-pulse text-foreground" />
            <p className="font-semibold">Tentative de connexion auto...</p>
        </div>
      </div>
    );
  }
  
   // If auto-login failed, show an error and a retry button
  if (error) {
     return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <div className="w-full max-w-sm p-4 text-center">
                 <div className="inline-block">
                    <Logo className="mx-auto h-12 w-12 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight mt-4 text-foreground">Connexion Échouée</h1>
                <p className="text-muted-foreground mt-2">
                    {error}
                </p>
                <Button onClick={() => window.location.reload()} className="mt-6">
                    Réessayer
                </Button>
            </div>
        </div>
     )
  }

  // Fallback content in case user is not redirected, though this should ideally not be reached.
  return (
     <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Redirection en cours...</p>
      </div>
  );
}
