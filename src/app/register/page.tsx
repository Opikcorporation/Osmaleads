'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useAuth, useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import {
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Collaborator } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function RegisterPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password.length < 6) {
        toast({
            variant: "destructive",
            title: "Mot de passe trop court",
            description: "Votre mot de passe doit contenir au moins 6 caractères.",
        });
        setIsLoading(false);
        return;
    }
    
    const email = `${username}@example.com`; // Transform username to email for Firebase

    try {
      // Hardcode the role assignment for the admin user.
      const role = username === 'Alessio_opik' ? 'admin' : 'collaborator';

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;
      
      const defaultAvatar = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];

      const newCollaborator: Collaborator = {
        id: firebaseUser.uid,
        name: name,
        username: username,
        email: null,
        role: role,
        avatarUrl: defaultAvatar.imageUrl,
      };
      
      const docRef = doc(firestore, 'collaborators', firebaseUser.uid);

      // Use a try-catch block specifically for the Firestore operation
      try {
        await setDoc(docRef, newCollaborator);
      } catch (firestoreError: any) {
        // If the error is a permission error, emit a detailed contextual error.
        if (firestoreError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'create',
                requestResourceData: newCollaborator,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        // Rethrow the error to be caught by the outer catch block for user notification
        throw firestoreError;
      }


      toast({
        title: 'Compte créé avec succès',
        description: "Vous allez être redirigé vers le tableau de bord.",
      });

      router.push('/dashboard');

    } catch (error: any) {
       let errorMessage = "Une erreur est survenue lors de l'inscription.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Ce nom d'utilisateur est déjà utilisé.";
      } else if (error.code === 'auth/weak-password') {
          errorMessage = "Le mot de passe doit contenir au moins 6 caractères.";
      } else if (error.code === 'permission-denied') {
          errorMessage = "Vous n'avez pas la permission de créer un compte.";
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
            <Label htmlFor="username">Nom d'utilisateur</Label>
            <Input id="username" type="text" placeholder="johndoe" required value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full text-base font-semibold" disabled={isLoading}>
            {isLoading ? 'Création du compte...' : 'Créer mon compte'}
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
