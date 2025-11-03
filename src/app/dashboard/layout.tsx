'use client';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Menu } from 'lucide-react';

import AppSidebar from '@/components/layout/app-sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '@/components/logo';
import { useUser, useFirestore, useAuth, useCollection, useMemoFirebase } from '@/firebase';
import { useEffect } from 'react';
import type { Collaborator } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { collection, query, where } from 'firebase/firestore';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Simple, robust query to get the collaborator profile.
  // This will only run when the user object is available.
  const collaboratorQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'collaborators'), where('id', '==', user.uid)) : null),
    [user, firestore]
  );
  
  // The useCollection hook handles loading and error states for us.
  const { data: collaboratorData, isLoading: isProfileLoading } = useCollection<Collaborator>(collaboratorQuery);
  
  const collaborator = collaboratorData?.[0];
  
  // Overall loading state depends on auth and profile fetching.
  const isLoading = isAuthLoading || (user && isProfileLoading);

  useEffect(() => {
    // If auth has finished loading and there's still no user, redirect to login.
    if (!isAuthLoading && !user) {
      router.push('/');
    }
  }, [isAuthLoading, user, router]);

  // While loading auth or the profile, show a clear loading message.
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Chargement du tableau de bord...</p>
      </div>
    );
  }
  
  // After all loading is done, if there's a user but no profile, it's a critical error.
  if (user && !collaborator) {
     return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background text-center">
            <div>
                <h2 className="text-xl font-semibold text-destructive">Erreur de Profil</h2>
                <p className="text-muted-foreground mt-2">
                    Impossible de charger le profil collaborateur associé à votre compte. <br />
                    Cela peut se produire si la création du profil a échoué lors de l'inscription.
                </p>
                <Button onClick={() => router.push('/')} className="mt-4">Retour à la connexion</Button>
            </div>
        </div>
    );
  }

  // If there's no user and we're not loading, we're likely redirecting.
  if (!user || !collaborator) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
            <p>Redirection en cours...</p>
        </div>
    );
  }

  // If we get here, everything is loaded and valid.
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
