'use client';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import Image from 'next/image';

import AppSidebar from '@/components/layout/app-sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useFirebase, useAuth } from '@/firebase'; // Use the main firebase hook
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // useFirebase is now the single source of truth for auth and profile state
  const { user, collaborator, isLoading, error } = useFirebase();
  const auth = useAuth(); // Get auth instance
  const router = useRouter();

  useEffect(() => {
    // If loading is done and there is no authenticated user, redirect to login.
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  const handleForceLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    router.push('/login');
  };

  // THIS IS THE PRIMARY GUARD.
  // While the provider is figuring out the auth state OR the profile, show a loading screen.
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Chargement de la session et du profil...</p>
      </div>
    );
  }

  // After loading, if there's an auth user but NO matching collaborator profile,
  // it's a critical error state. We must stop rendering here.
  if (user && !collaborator) {
     return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
            <h1 className="text-xl font-semibold text-destructive">Profil non trouvé</h1>
            <p className="text-muted-foreground">Votre compte utilisateur existe, mais nous n'avons pas trouvé de profil associé.</p>
            <p className="text-sm text-muted-foreground">Veuillez contacter un administrateur.</p>
             <Button onClick={handleForceLogout} className="mt-4">Retour à la connexion</Button>
        </div>
      </div>
    );
  }
  
  // This case covers the brief moment before the useEffect redirect triggers
  // if the user is not logged in at all. It acts as a final guard.
  // Instead of rendering children that will error, we render a loading state until the redirect is complete.
  if (!user || !collaborator) {
     return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Redirection vers la page de connexion...</p>
      </div>
    );
  }


  // If we get here, everything is loaded and valid. Render the full layout.
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
                <Image src="/logo.png" alt="Osmaleads Logo" width={120} height={30} />
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
