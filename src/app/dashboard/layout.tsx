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
    if (isUserLoading) {
      setIsLoading(true);
      return;
    }
    if (!user) {
      router.push('/');
      return;
    }

    setIsLoading(true);
    const fetchCollaborator = async () => {
      try {
        const userData = await getUserById(firestore, user.uid);
        if (userData) {
          setCollaborator(userData);
        } else {
          // Profile doesn't exist, so we create it.
          console.log("User profile not found in 'collaborators', creating one...");
          const defaultAvatar = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];
          
          const newCollaborator: Collaborator = {
            id: user.uid,
            name: user.displayName || 'Nouveau Collaborateur',
            username: user.email?.split('@')[0] || `user-${user.uid.substring(0,5)}`,
            email: user.email,
            role: 'collaborator', // Default role
            avatarUrl: defaultAvatar.imageUrl,
          };
          
          const docRef = doc(firestore, 'collaborators', user.uid);
          
          // Use a non-blocking setDoc with proper error handling
          setDoc(docRef, newCollaborator)
            .then(() => {
              console.log("Successfully created collaborator profile.");
              setCollaborator(newCollaborator);
            })
            .catch((firestoreError) => {
              // This is where we create and emit the detailed error
              console.error("Permission denied while creating collaborator profile. Emitting contextual error.");
              const permissionError = new FirestorePermissionError({
                 path: docRef.path,
                 operation: 'create',
                 requestResourceData: newCollaborator,
              });
              errorEmitter.emit('permission-error', permissionError);
              // We also re-throw it to be caught by the outer block
              throw permissionError;
            });
        }
      } catch (error) {
        console.error("Failed to fetch or create collaborator profile:", error);
        toast({
          variant: "destructive",
          title: "Erreur de chargement du profil",
          description: "Impossible de charger ou de créer votre profil. Veuillez contacter le support.",
          duration: 9000,
        });
        // Log out user and redirect to login page to prevent loops
        if (auth) {
          await signOut(auth);
        }
        router.push('/');
      } finally {
        // This will only run after success or a handled error
        setIsLoading(false);
      }
    };

    if (user && firestore) {
      fetchCollaborator();
    }
  }, [user, isUserLoading, firestore, router, toast, auth]);


  if (isLoading || !collaborator) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Chargement du tableau de bord...</p>
      </div>
    );
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
