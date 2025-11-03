'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useEffect, useState } from 'react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function RegisterPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
        toast({
            variant: "destructive",
            title: "Champs manquants",
            description: "Veuillez remplir tous les champs.",
        });
        return;
    }
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const defaultAvatar = PlaceHolderImages.find(p => p.id === 'user6') || PlaceHolderImages[0];
      const avatarUrl = defaultAvatar.imageUrl;

      const newCollaborator = {
        id: firebaseUser.uid,
        name: name,
        email: firebaseUser.email,
        role: 'collaborator', // Default role
        avatarUrl: avatarUrl,
      };

      const userDocRef = doc(firestore, 'collaborators', firebaseUser.uid);
      await setDoc(userDocRef, newCollaborator);

      toast({
        title: "Compte créé",
        description: "Bienvenue sur LeadFlowAI!",
      });
      router.push('/dashboard');

    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
      let errorMessage = "Impossible de créer le compte.";
      if (error.code === 'auth/email-already-in-use') {
          errorMessage = "Cette adresse email est déjà utilisée.";
      } else if (error.code === 'auth/weak-password') {
          errorMessage = "Le mot de passe doit contenir au moins 6 caractères.";
      }
      
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: errorMessage,
      });
    } finally {
        setIsLoading(false);
    }
  };
  
  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
       <div className="w-full max-w-sm p-4">
        <div className="text-center mb-8">
            <div className="inline-block">
              <Logo className="mx-auto h-12 w-12 text-foreground dark:text-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mt-4 text-foreground dark:text-foreground">Créer un compte</h1>
            <p className="text-muted-foreground mt-2">
              Rejoignez LeadFlowAI dès maintenant.
            </p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="full-name">Nom complet</Label>
                <Input id="full-name" placeholder="Jean Dupont" required value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="email@exemple.com" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full text-base font-semibold" disabled={isLoading}>
                {isLoading ? 'Création en cours...' : 'Créer mon compte'}
            </Button>
            <div className="mt-4 text-center text-sm">
            Vous avez déjà un compte?{' '}
            <Link href="/" className="underline font-semibold">
                Se connecter
            </Link>
            </div>
        </form>
       </div>
    </div>
  );
}
