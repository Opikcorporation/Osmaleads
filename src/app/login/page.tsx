'use client';

import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { useAuth, useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import type { Collaborator } from '@/lib/types';
import { getRandomColor } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

// --- Configuration du Compte Admin Cible ---
const ADMIN_USERNAME = 'alessio_opik';
const ADMIN_EMAIL = `${ADMIN_USERNAME}@example.com`;
const ADMIN_PASSWORD = 'password123';
// ---------------------------------------------

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('Démarrage...');
  const [error, setError] = useState<string | null>(null);

  const ensureAdminAccount = useCallback(async () => {
    if (!auth || !firestore) {
      setStatus('En attente des services Firebase...');
      return;
    }

    setStatus(`Vérification du compte admin "${ADMIN_USERNAME}"...`);

    try {
      // On essaye de créer l'utilisateur. Si l'email est déjà utilisé,
      // c'est que le compte existe déjà, ce qui est notre but.
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        ADMIN_EMAIL,
        ADMIN_PASSWORD
      );
      
      // Si la création réussit (le compte n'existait pas), on crée son profil
      setStatus('Compte admin non trouvé. Création en cours...');
      const adminUser = userCredential.user;
      const adminRef = doc(firestore, 'collaborators', adminUser.uid);
      const profileData: Collaborator = {
        id: adminUser.uid,
        name: 'Alessio Opik',
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        role: 'admin',
        avatarColor: getRandomColor(),
      };
      setDocumentNonBlocking(adminRef, profileData, { merge: true });
      setStatus('Compte admin initialisé.');

    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        // C'est le cas normal, le compte existe déjà, on ne fait rien.
        setStatus('Compte admin prêt.');
      } else {
        // Une autre erreur inattendue
        setError(`Erreur critique lors de l'initialisation : ${err.message}`);
        setStatus('Échec de l\'initialisation');
      }
    }
  }, [auth, firestore]);

  // Exécuter la vérification du compte admin une seule fois au chargement
  useEffect(() => {
    if (!isUserLoading && !user) {
        ensureAdminAccount();
    }
  }, [isUserLoading, user, ensureAdminAccount]);
  
  // Rediriger si l'utilisateur est déjà connecté
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
      // La redirection est gérée par le useEffect qui surveille `user`
    } catch (error: any) {
      console.error(error);
      let errorMessage = "Le nom d'utilisateur ou le mot de passe est incorrect.";
      if (error.code === 'auth/invalid-credential') {
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

  // Affichage pendant que le chargement initial ou la redirection a lieu
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
