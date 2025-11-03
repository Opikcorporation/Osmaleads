'use client';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Menu } from 'lucide-react';

import AppSidebar from '@/components/layout/app-sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '@/components/logo';
import { useUser, useFirestore, errorEmitter, FirestorePermissionError, useAuth } from '@/firebase';
import { useEffect, useState } from 'react';
import { getUserById } from '@/lib/data';
import { type Collaborator } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // 1. Ne rien faire tant que l'état d'authentification ou firestore est en cours de chargement.
    if (isUserLoading || !firestore) {
      setIsLoading(true);
      return;
    }

    // 2. Si le chargement est terminé et qu'il n'y a pas d'utilisateur, rediriger.
    if (!user) {
      router.push('/');
      return;
    }
    
    // 3. Si l'utilisateur est authentifié et que Firestore est prêt, on peut agir.
    const fetchCollaborator = async () => {
      setIsLoading(true);
      try {
        const userData = await getUserById(firestore, user.uid);
        if (userData) {
          setCollaborator(userData);
        } else {
          // Le profil n'existe pas, on le crée.
          console.log("Profil collaborateur non trouvé, création en cours...");
          const defaultAvatar = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];
          
          const newCollaborator: Collaborator = {
            id: user.uid,
            name: user.displayName || 'Nouveau Collaborateur',
            username: user.email?.split('@')[0] || `user-${user.uid.substring(0,5)}`,
            email: user.email,
            role: 'collaborator', // Rôle par défaut
            avatarUrl: defaultAvatar.imageUrl,
          };
          
          const docRef = doc(firestore, 'collaborators', user.uid);
          
          // Utiliser setDoc pour créer le profil.
          // Gérer l'erreur de permission de manière contextuelle.
          await setDoc(docRef, newCollaborator).catch((error) => {
            if (error.code === 'permission-denied') {
              const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: newCollaborator,
              });
              errorEmitter.emit('permission-error', permissionError);
            }
            // Re-lancer l'erreur pour qu'elle soit attrapée par le bloc catch externe.
            throw error;
          });
          
          console.log("Profil collaborateur créé avec succès.");
          setCollaborator(newCollaborator);
        }
      } catch (error: any) {
        // Gérer les erreurs, notamment les permissions.
        if (error.code !== 'permission-denied') {
            console.error("Échec de la récupération ou création du profil :", error);
        }

        toast({
          variant: "destructive",
          title: "Erreur de chargement du profil",
          description: "Impossible de charger ou créer votre profil. Vous allez être déconnecté.",
          duration: 9000,
        });

        // Déconnecter et rediriger pour éviter les boucles.
        if (auth) {
          await signOut(auth);
        }
        router.push('/');
        return;
      } finally {
        // Mettre fin au chargement uniquement quand tout est terminé.
        setIsLoading(false);
      }
    };

    fetchCollaborator();
  }, [user, isUserLoading, firestore, router, toast, auth]);


  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Chargement du tableau de bord...</p>
      </div>
    );
  }

  // Si le chargement est terminé mais qu'il n'y a toujours pas de collaborateur,
  // C'est qu'il y a eu un problème et que la redirection va avoir lieu.
  // Afficher un état de chargement évite un flash de l'interface.
  if (!collaborator) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <p>Finalisation de la session...</p>
        </div>
    )
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[256px_1fr]">
      <AppSidebar user={collaborator} />
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <AppSidebar user={collaborator} />
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
                <Logo className="h-6 w-6" />
                <span>LeadFlowAI</span>
            </Link>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
