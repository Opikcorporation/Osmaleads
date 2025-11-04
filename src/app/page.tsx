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
  
  // Start with a loading state that reflects the auto-login attempt
  const [isLoggingIn, setIsLoggingIn] = useState(true); 
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If a user session already exists, redirect immediately.
    if (!isUserLoading && user) {
      router.push('/dashboard');
      return;
    }

    // If there's no user, attempt auto-login.
    if (!isUserLoading && !user) {
      const autoLogin = async () => {
        setIsLoggingIn(true);
        setError(null);
        
        try {
          // Use the default admin credentials
          await signInWithEmailAndPassword(auth, 'admin01@example.com', 'password123');
          // On success, the first useEffect will catch the user change and redirect.
          // No need to call router.push here to avoid race conditions.
        } catch (err: any) {
          console.error('Auto-login Error:', err);
          let errorMessage = 'La connexion automatique a échoué.';
          if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            errorMessage = "Le compte admin par défaut n'existe pas ou les identifiants sont incorrects.";
          }
          setError(errorMessage);
          setIsLoggingIn(false); // Stop loading on error
        }
      };

      autoLogin();
    }
  }, [isUserLoading, user, auth, router]);

  
  // Show a loading screen while checking auth state or attempting login.
  if (isUserLoading || isLoggingIn) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
            <Logo className="mx-auto h-12 w-12 animate-pulse text-foreground" />
            <p className="font-semibold">Connexion au compte admin...</p>
        </div>
      </div>
    );
  }
  
   // If auto-login fails, show an error and a way to retry.
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
                 <p className="text-sm text-muted-foreground mt-2">Veuillez vérifier que le compte admin a bien été créé.</p>
                <Button onClick={() => window.location.reload()} className="mt-6">
                    Réessayer
                </Button>
            </div>
        </div>
     )
  }

  // This content is a fallback and should ideally not be reached if redirection works correctly.
  return (
     <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Redirection vers le tableau de bord...</p>
      </div>
  );
}
