'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useAuth, useFirestore, useUser } from '@/firebase';
import {
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Collaborator } from '@/lib/types';
import { getRandomColor } from '@/lib/colors';

export default function RegisterPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [name, setName] = useState('Admin User');
  const [username, setUsername] = useState('Admin01');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!firestore || !auth) {
        toast({
            variant: "destructive",
            title: "Erreur d'initialisation",
            description: "Les services Firebase ne sont pas disponibles. Veuillez réessayer.",
        });
        setIsLoading(false);
        return;
    }

    if (password.length < 6) {
        toast({
            variant: "destructive",
            title: "Mot de passe trop court",
            description: "Votre mot de passe doit contenir au moins 6 caractères.",
        });
        setIsLoading(false);
        return;
    }
    
    const email = `${username}@example.com`;

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;
      
      // 2. Prepare collaborator data
      const role = username === 'Admin01' ? 'admin' : 'collaborator';
      
      const newCollaborator: Omit<Collaborator, 'id'> = {
        name: name,
        username: username,
        email: email,
        role: role,
        avatarColor: getRandomColor(),
      };
      
      // 3. Create collaborator document in Firestore
      // The ID of the document MUST match the UID of the auth user
      const docRef = doc(firestore, 'collaborators', firebaseUser.uid);
      
      // We explicitly add the id to the document data as well for easier querying
      await setDoc(docRef, {
        ...newCollaborator,
        id: firebaseUser.uid
      });
        
      toast({
          title: 'Compte créé avec succès',
          description: "Vous allez être redirigé vers le tableau de bord.",
      });
      // The onAuthStateChanged listener and the layout will handle the redirect.
      // No need to push here, to avoid race conditions.

    } catch (error: any) {
       let errorMessage = "Une erreur est survenue lors de l'inscription.";
       
       if (error.code === 'auth/email-already-in-use') {
         errorMessage = "Ce nom d'utilisateur (email) est déjà utilisé.";
       }
      
      toast({
        variant: 'destructive',
        title: "Erreur d'inscription",
        description: errorMessage,
      });

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
              <Logo className="mx-auto h-12 w-12 text-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mt-4 text-foreground">Créer un Compte</h1>
            <p className="text-muted-foreground mt-2">
              Rejoignez LeadFlowAI dès aujourd'hui.
            </p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input id="name" type="text" placeholder="John Doe" required value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Nom d'utilisateur (Admin)</Label>
            <Input id="username" type="text" placeholder="Admin01" required value={username} onChange={e => setUsername(e.target.value)} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full text-base font-semibold" disabled={isLoading}>
            {isLoading ? 'Création du compte...' : 'Créer mon compte Admin'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
            Vous avez déjà un compte ?{' '}
            <Link href="/" className="font-semibold text-primary hover:underline">
                Se connecter
            </Link>
        </p>
      </div>
    </div>
  );
}
