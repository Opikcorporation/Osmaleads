'use client';

import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if the user is already logged in
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [isUserLoading, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setIsSubmitting(true);
    // The convention is to create emails from usernames for the password provider
    const emailToLogin = `${username}@example.com`;

    try {
      await signInWithEmailAndPassword(auth, emailToLogin, password);
      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue !',
      });
      // The useEffect above will handle the redirection to the dashboard
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

  // Show a loading screen while auth state is being determined or if already logged in
  if (isUserLoading || user) {
     return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Logo className="mx-auto h-12 w-12 animate-pulse text-foreground" />
          <p className="font-semibold">Chargement de la session...</p>
        </div>
      </div>
    );
  }

  // Render the login form if not loading and no user is logged in
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight flex items-center justify-center gap-2">
            <Logo className="h-7 w-7" /> LeadFlowAI
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
           <div className="mt-4 text-center text-sm">
            <p className="text-muted-foreground">
              Utilisateur admin par défaut : <span className="font-mono">alessio_opik</span>
            </p>
            <p className="text-muted-foreground">
              Mot de passe : <span className="font-mono">password123</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
