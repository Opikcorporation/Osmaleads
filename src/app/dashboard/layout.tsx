'use client';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Menu } from 'lucide-react';

import AppSidebar from '@/components/layout/app-sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '@/components/logo';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Collaborator } from '@/lib/types';
import { doc } from 'firebase/firestore';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  // Use useDoc to get the collaborator profile based on the authenticated user's UID
  const collaboratorRef = useMemoFirebase(
    () => (user ? doc(firestore, 'collaborators', user.uid) : null),
    [user, firestore]
  );
  const { data: collaborator, isLoading: isProfileLoading } = useDoc<Collaborator>(collaboratorRef);

  // This is the simplest, most robust check.
  // We wait for auth to be ready, then redirect if no user is found.
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [isUserLoading, user, router]);

  // While loading auth OR the user profile, show a clear loading message.
  const isLoading = isUserLoading || (user && isProfileLoading);
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Chargement de la session et du profil...</p>
      </div>
    );
  }
  
  // After loading, if there's a user but no profile, something is wrong
  // This can happen if the Firestore document wasn't created on registration
  if (user && !collaborator) {
     return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
            <h1 className="text-xl font-semibold">Profil introuvable</h1>
            <p className="text-muted-foreground">Votre profil utilisateur n'a pas été trouvé dans la base de données.</p>
             <p className="text-sm text-muted-foreground mt-2">Veuillez réessayer de vous inscrire ou contacter le support.</p>
             <Button onClick={() => router.push('/')} className="mt-4">Retour à la connexion</Button>
        </div>
      </div>
    );
  }

  // If we get here, everything is loaded and valid.
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[256px_1fr]">
      <AppSidebar user={collaborator!} />
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
              <AppSidebar user={collaborator!} />
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
