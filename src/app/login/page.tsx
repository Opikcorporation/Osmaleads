'use client';

import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { useFirestore } from '@/firebase';
import type { Collaborator } from '@/lib/types';
import { getRandomColor } from '@/lib/colors';

/**
 * Ensures the default admin account exists in both Auth and Firestore.
 * This should only be called in a safe, client-side context on initial load.
 */
const ensureAdminExists = async (auth: any, firestore: any) => {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'password123';
    const adminUsername = 'alessio_opik';
    const adminName = 'Alessio Opik';

    try {
        // First, try to sign in. If it succeeds, the user exists.
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    } catch (error: any) {
        // If sign-in fails because the user is not found, create the user.
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
                const user = userCredential.user;
                const adminProfile: Collaborator = {
                    id: user.uid,
                    name: adminName,
                    username: adminUsername,
                    email: adminEmail,
                    role: 'admin',
                    avatarColor: getRandomColor(),
                };
                // Create the Firestore document for the admin.
                await setDoc(doc(firestore, 'collaborators', user.uid), adminProfile);
            } catch (creationError) {
                console.error('Failed to create admin user:', creationError);
            }
        }
    }
};


export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminCheckDone, setIsAdminCheckDone] = useState(false);

  // This useEffect ensures the admin account exists.
  useEffect(() => {
    if (auth && firestore && !isAdminCheckDone) {
      ensureAdminExists(auth, firestore).finally(() => {
        setIsAdminCheckDone(true);
        // After ensuring admin exists, sign out to allow for a clean login.
        auth.signOut();
      });
    }
  }, [auth, firestore, isAdminCheckDone]);
  
  // This useEffect handles redirection after login.
  useEffect(() => {
    // Only redirect if the loading is complete and a user is present.
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [isUserLoading, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setIsSubmitting(true);
    // Use the actual email for login, which matches the admin creation logic.
    const emailToLogin = username === 'alessio_opik' ? 'admin@example.com' : `${username}@example.com`;

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

  // While checking for the admin or waiting for auth state, show loading.
  if (!isAdminCheckDone || isUserLoading) {
     return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Logo className="mx-auto h-12 w-12 animate-pulse text-foreground" />
          <p className="font-semibold">Préparation de l'application...</p>
        </div>
      </div>
    );
  }

  // If loading is done and there's no user, show the login form.
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
