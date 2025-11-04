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

  // Redirection si l'utilisateur est déjà connecté.
  // Ce useEffect est la clé pour éviter les boucles.
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [isUserLoading, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setIsSubmitting(true);
    const emailToLogin = `${username}@example.com`;

    try {
      await signInWithEmailAndPassword(auth, emailToLogin, password);
      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue !',
      });
      // La redirection sera gérée par le useEffect ci-dessus lorsque l'état de `user` changera.
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

  // Pendant que Firebase vérifie l'état de connexion, ou si l'utilisateur est déjà connecté et sur le point d'être redirigé.
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

  // Si le chargement est terminé et qu'il n'y a pas d'utilisateur, afficher le formulaire.
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
