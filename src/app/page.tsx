'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, type User } from 'firebase/auth';
import { useEffect, useState, useCallback }from 'react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Collaborator } from '@/lib/types';
import { getRandomColor } from '@/lib/colors';

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [status, setStatus] = useState('Chargement...'); 
  const [error, setError] = useState<string | null>(null);

  // This function ensures the admin profile exists and is valid.
  const ensureAdminProfile = useCallback(async (firebaseUser: User) => {
    if (!firestore) return;
    setStatus('Vérification du profil admin...');
    const adminRef = doc(firestore, 'collaborators', firebaseUser.uid);
    
    try {
        const docSnap = await getDoc(adminRef);
        let profileData: Collaborator;

        if (!docSnap.exists() || !docSnap.data()?.role) {
            // Profile is missing or broken, we create/overwrite it.
            setStatus('Profil admin manquant. Création...');
            profileData = {
                id: firebaseUser.uid,
                name: 'Admin',
                username: 'admin01',
                email: 'admin01@example.com',
                role: 'admin',
                avatarColor: getRandomColor(),
            };
            await setDoc(adminRef, profileData);
        } else {
            // Profile exists, we just use it.
            profileData = docSnap.data() as Collaborator;
        }
        
        setStatus('Connexion réussie. Redirection...');
        router.push('/dashboard');

    } catch (e: any) {
        console.error("Error ensuring admin profile:", e);
        setError(`Erreur lors de la vérification du profil : ${e.message}`);
        setStatus('Échec de la vérification');
    }
  }, [firestore, router]);


  useEffect(() => {
    // If a user is already logged in, ensure their profile is good.
    if (!isUserLoading && user) {
        if(user.email === 'admin01@example.com') {
            ensureAdminProfile(user);
        } else {
             // For other users, we just redirect. The layout will handle profile checks.
            router.push('/dashboard');
        }
      return;
    }

    // If no user, attempt auto-login as admin.
    if (!isUserLoading && !user && auth) {
      const autoLogin = async () => {
        setStatus('Connexion automatique au compte admin...');
        setError(null);
        
        try {
          const userCredential = await signInWithEmailAndPassword(auth, 'admin01@example.com', 'password123');
          // On success, the user object will update, and this effect will re-run,
          // which will then call ensureAdminProfile.
        } catch (err: any) {
          console.error('Auto-login Error:', err);
          let errorMessage = 'La connexion automatique a échoué.';
          if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            errorMessage = "Le compte admin par défaut n'existe pas ou les identifiants sont incorrects. Il faut le créer via le dashboard.";
          }
          setError(errorMessage);
          setStatus('Échec de la connexion');
        }
      };

      autoLogin();
    }
  }, [isUserLoading, user, auth, ensureAdminProfile, router]);

  
  // Show a loading screen while checking auth state or attempting login.
  if (!error) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
            <Logo className="mx-auto h-12 w-12 animate-pulse text-foreground" />
            <p className="font-semibold">{status}</p>
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
                 <p className="text-sm text-muted-foreground mt-2">Cela peut arriver si les identifiants ont été modifiés. Essayez de recharger.</p>
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
        <p>Redirection en cours...</p>
      </div>
  );
}
