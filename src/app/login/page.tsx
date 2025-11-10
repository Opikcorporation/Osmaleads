'use client';

import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import Image from 'next/image';

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // This useEffect handles redirection after login.
  useEffect(() => {
    // Only redirect if the loading is complete and a user is present.
    if (!isUserLoading && user) {
      router.push('/dashboard'); // Redirect to the root dashboard page
    }
  }, [isUserLoading, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setIsSubmitting(true);
    // The username is used to construct the email.
    const emailToLogin = `${username}@example.com`;

    try {
      await signInWithEmailAndPassword(auth, emailToLogin, password);
      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue !',
      });
      // Redirection is handled by the useEffect above.
    } catch (error: any) {
      console.error("Login failed:", error);
      let errorMessage = "Le nom d'utilisateur ou le mot de passe est incorrect.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          errorMessage = "Le nom d'utilisateur ou le mot de passe est incorrect.";
      }
      toast({
        variant: 'destructive',
        title: 'Échec de la connexion',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // While waiting for auth state, or if the user is already logged in and about to be redirected.
  if (isUserLoading || user) {
     return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="font-semibold text-xl animate-pulse">Osmaleads</p>
          <p className="font-semibold">Chargement de la session...</p>
        </div>
      </div>
    );
  }

  // If loading is done and there's no user, show the login form.
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Image src="/logo.png" alt="Osmaleads Logo" width={140} height={35} />
          </CardTitle>
          <CardDescription>
            Connectez-vous pour accéder à votre tableau de bord.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <Input
                id="username"
                type="text"
                placeholder="ex: alessio_opik"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
