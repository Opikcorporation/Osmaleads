'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [username, setUsername] = useState('Admin01');
  const [password, setPassword] = useState('12345678a');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const email = `${username}@example.com`; // Transform username to email for Firebase
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Connexion réussie",
        description: "Bienvenue !",
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Login Error:", error);
      let errorMessage = "Une erreur est survenue lors de la connexion.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Nom d'utilisateur ou mot de passe incorrect.";
      }
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-sm p-4">
        <div className="text-center mb-8">
            <div className="inline-block">
              <Logo className="mx-auto h-12 w-12 text-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mt-4 text-foreground">LeadFlowAI</h1>
            <p className="text-muted-foreground mt-2">
              Connectez-vous à votre tableau de bord
            </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nom d'utilisateur</Label>
            <Input id="username" type="text" placeholder="Admin01" required value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full text-base font-semibold" disabled={isLoading}>
            {isLoading ? 'Connexion en cours...' : 'Se connecter'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
            Vous n'avez pas de compte ?{' '}
            <Link href="/register" className="font-semibold text-primary hover:underline">
                Créer un compte
            </Link>
        </p>
      </div>
    </div>
  );
}
