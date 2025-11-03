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
    // 1. Si le chargement est en cours, ne rien faire.
    if (isUserLoading || !firestore) {
      setIsLoading(true);
      return;
    }

    // 2. Si le chargement est terminé et qu'il n'y a pas d'utilisateur, rediriger.
    if (!user) {
      router.push('/');
      setIsLoading(false); // Le chargement est terminé, il n'y a pas d'utilisateur.
      return;
    }
    
    // 3. L'utilisateur est authentifié et Firestore est prêt.
    const fetchCollaborator = async () => {
      try {
        const userData = await getUserById(firestore, user.uid);
        if (userData) {
          setCollaborator(userData);
          setIsLoading(false); // Profil trouvé, chargement terminé.
        } else {
          // Le profil n'existe pas, on tente de le créer.
          console.log("Profil collaborateur non trouvé, tentative de création...");
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
          
          // Tenter de créer le document.
          await setDoc(docRef, newCollaborator);

          console.log("Profil collaborateur créé avec succès.");
          setCollaborator(newCollaborator);
        }
      } catch (error: any) {
        // En cas d'erreur (y compris de permission sur le setDoc)
        console.error("Échec de la récupération ou création du profil :", error);
        
        // On émet l'erreur contextuelle pour le débogage.
        const permissionError = new FirestorePermissionError({
          path: `collaborators/${user.uid}`,
          operation: 'create',
          requestResourceData: 'hidden', // On ne log plus les données ici pour éviter la redondance
        });
        errorEmitter.emit('permission-error', permissionError);

        toast({
          variant: "destructive",
          title: "Erreur de chargement du profil",
          description: "Impossible de charger ou créer votre profil. Vous allez être déconnecté.",
          duration: 9000,
        });

        // Déconnexion et redirection en cas d'échec.
        if (auth) {
          await signOut(auth);
        }
        router.push('/');
      } finally {
        setIsLoading(false); // Le chargement est terminé quoi qu'il arrive.
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

  // Si le chargement est terminé mais qu'on a pas de collaborateur,
  // C'est qu'il y a eu un problème et que la redirection a déjà eu lieu ou va avoir lieu.
  if (!collaborator) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <p>Redirection en cours...</p>
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
