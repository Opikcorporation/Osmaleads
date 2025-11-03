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
  const [isLoading, setIsLoading] = useState(true); // Local loading state for this layout
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // 1. Do nothing until Firebase has determined the auth state.
    if (isUserLoading || !firestore) {
      setIsLoading(true);
      return;
    }

    // 2. If auth state is determined and there's no user, redirect to login.
    if (!isUserLoading && !user) {
      router.push('/');
      return; // No need to set loading states, redirect will handle it.
    }
    
    // 3. If we have a user and firestore is ready, fetch or create the profile.
    if (user && firestore) {
      const fetchOrCreateProfile = async () => {
        try {
          const userData = await getUserById(firestore, user.uid);
          
          if (userData) {
            setCollaborator(userData);
          } else {
            // Profile doesn't exist, let's create it.
            console.log("Collaborator profile not found, creating one...");
            const defaultAvatar = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];
            const username = user.email?.split('@')[0] || `user-${user.uid.substring(0,5)}`;

            const newCollaborator: Collaborator = {
              id: user.uid,
              name: user.displayName || 'Nouveau Collaborateur',
              username: username,
              email: user.email,
              role: 'collaborator', // Default role
              avatarUrl: defaultAvatar?.imageUrl || 'https://picsum.photos/seed/user/200',
            };
            
            const docRef = doc(firestore, 'collaborators', user.uid);
            
            // This is a crucial operation. If it fails, we need to handle it.
            await setDoc(docRef, newCollaborator);

            console.log("Collaborator profile created successfully.");
            setCollaborator(newCollaborator);
          }
        } catch (error: any) {
          // This block now specifically handles errors in fetching or creating the profile.
          const permissionError = new FirestorePermissionError({
            path: `collaborators/${user.uid}`,
            operation: 'create', // Most likely failure point
            requestResourceData: 'hidden', 
          });
          errorEmitter.emit('permission-error', permissionError);

          toast({
            variant: "destructive",
            title: "Impossible de charger ou créer votre profil",
            description: "Un problème de permission est survenu. Vous allez être déconnecté.",
            duration: 9000,
          });

          // If we fail, something is wrong with the rules or connection. Log out the user.
          await signOut(auth);
          router.push('/');
        } finally {
          // No matter what, once we've tried, we're done loading.
          setIsLoading(false);
        }
      };

      fetchOrCreateProfile();
    }
  }, [user, isUserLoading, firestore, auth, router, toast]);


  // Display a loading screen while checking auth and fetching profile.
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Chargement du tableau de bord...</p>
      </div>
    );
  }

  // If loading is finished but there's no collaborator profile, something went wrong
  // and the user has been redirected. This prevents rendering the dashboard in a broken state.
  if (!collaborator) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <p>Redirection en cours...</p>
        </div>
    )
  }

  // Render the full dashboard layout
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
