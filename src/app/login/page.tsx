'use client';

import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { useAuth, useFirestore, useUser } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type User,
} from 'firebase/auth';
import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Collaborator } from '@/lib/types';
import { getRandomColor } from '@/lib/colors';
import { Button } from '@/components/ui/button';

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

  const [status, setStatus] = useState('Démarrage...');
  const [error, setError] = useState<string | null>(null);

  const ensureAdminAccount = useCallback(async () => {
    if (!auth || !firestore) {
      setStatus('En attente des services Firebase...');
      return;
    }

    setStatus(`Préparation du compte admin "${ADMIN_USERNAME}"...`);
    let adminUser: User;

    try {
      // 1. Essayer de connecter l'admin
      setStatus('Tentative de connexion...');
      const userCredential = await signInWithEmailAndPassword(
        auth,
        ADMIN_EMAIL,
        ADMIN_PASSWORD
      );
      adminUser = userCredential.user;
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        // 2. Si l'utilisateur n'existe pas, le créer
        setStatus('Compte admin non trouvé. Création en cours...');
        try {
          const newUserCredential = await createUserWithEmailAndPassword(
            auth,
            ADMIN_EMAIL,
            ADMIN_PASSWORD
          );
          adminUser = newUserCredential.user;
        } catch (creationError: any) {
          setError(
            `Erreur critique lors de la création du compte : ${creationError.message}`
          );
          setStatus('Échec de la création');
          return;
        }
      } else {
        // Autre erreur de connexion
        setError(`Erreur de connexion : ${err.message}`);
        setStatus('Échec de la connexion');
        return;
      }
    }

    // 3. À ce stade, nous avons un utilisateur authentifié (créé ou connecté).
    // On vérifie et répare son profil Firestore.
    setStatus('Vérification et réparation du profil de la base de données...');
    const adminRef = doc(firestore, 'collaborators', adminUser.uid);

    try {
      const docSnap = await getDoc(adminRef);

      const profileData: Collaborator = {
        id: adminUser.uid,
        name: 'Alessio Opik',
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        role: 'admin',
        avatarColor: docSnap.exists()
          ? docSnap.data().avatarColor || getRandomColor()
          : getRandomColor(),
      };

      // Écraser le profil pour s'assurer qu'il est correct et complet.
      await setDoc(adminRef, profileData, { merge: true });

      setStatus('Profil admin validé. Redirection vers le tableau de bord...');
      // La redirection est gérée par le useEffect principal qui surveille `user`
    } catch (e: any) {
      setError(`Erreur lors de la synchronisation du profil : ${e.message}`);
      setStatus('Échec de la synchronisation');
    }
  }, [auth, firestore]);

  useEffect(() => {
    // Si un utilisateur (n'importe lequel) est déjà connecté et que le chargement est terminé, le rediriger.
    if (!isUserLoading && user) {
      setStatus('Utilisateur déjà connecté. Redirection...');
      router.push('/dashboard');
      return;
    }
    
    // Si le chargement est terminé et qu'il n'y a PAS d'utilisateur, on lance le processus de connexion forcée.
    if (!isUserLoading && !user) {
        ensureAdminAccount();
    }
  }, [isUserLoading, user, ensureAdminAccount, router]);


  // Affichage pendant que le processus est en cours
  if (isUserLoading || (!error && !user)) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Logo className="mx-auto h-12 w-12 animate-pulse text-foreground" />
          <p className="font-semibold">{status}</p>
        </div>
      </div>
    );
  }

  // En cas d'erreur bloquante, on l'affiche.
  if (error) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="w-full max-w-sm p-4 text-center">
          <div className="inline-block">
            <Logo className="mx-auto h-12 w-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-4 text-foreground">
            Une Erreur Est Survenue
          </h1>
          <p className="text-muted-foreground mt-2">
            {status}: {error}
          </p>
          <Button onClick={() => window.location.reload()} className="mt-6">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return null; // Affichage vide pendant la redirection finale.
}
