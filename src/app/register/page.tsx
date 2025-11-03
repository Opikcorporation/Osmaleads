'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useEffect, useState } from 'react';
import { useAuth, useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function RegisterPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profilePicture) {
        toast({
            variant: "destructive",
            title: "Erreur",
            description: "Veuillez sélectionner une photo de profil.",
        });
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // For now, we will use a placeholder for the avatar URL
      const avatarUrl = "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxwZXJzb24lMjBwb3J0cmFpdHxlbnwwfHx8fDE3NjIwNzc3MTJ8MA&ixlib=rb-4.1.0&q=80&w=1080";

      const newCollaborator = {
        id: firebaseUser.uid,
        name: `${firstName} ${lastName}`,
        email: firebaseUser.email,
        role: 'collaborator', // Default role
        avatarUrl: avatarUrl,
      };

      const userDocRef = doc(firestore, 'collaborators', firebaseUser.uid);
      setDocumentNonBlocking(userDocRef, newCollaborator, { merge: true });

      toast({
        title: "Compte créé",
        description: "Bienvenue sur LeadFlowAI!",
      });
      router.push('/dashboard');

    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error.message || "Impossible de créer le compte.",
      });
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
      <div className="w-full max-w-md p-4">
        <Card className="rounded-xl border-2 border-primary/20 shadow-xl">
          <CardHeader className="space-y-4 text-center">
             <div className="inline-block">
              <Logo className="mx-auto h-12 w-12" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-primary">Create an Account</CardTitle>
            <CardDescription className="text-lg">
              Join LeadFlowAI and start managing your leads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input id="first-name" placeholder="Lee" required value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input id="last-name" placeholder="Robinson" required value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="lee@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-picture">Profile Picture</Label>
                <Input id="profile-picture" type="file" required className="file:text-primary file:font-semibold" onChange={e => setProfilePicture(e.target.files ? e.target.files[0] : null)} />
                 <p className="text-xs text-muted-foreground">A profile picture is required.</p>
              </div>
              <Button type="submit" className="w-full text-lg font-semibold">
                Create account
              </Button>
              <div className="mt-4 text-center text-sm">
                Already have an account?{' '}
                <Link href="/" className="underline">
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
