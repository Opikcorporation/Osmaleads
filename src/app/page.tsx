'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useAuth, useUser } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    initiateEmailSignIn(auth, email, password);
    toast({
      title: "Tentative de connexion...",
      description: "Veuillez patienter.",
    });
  };

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-100 dark:bg-zinc-950">
      <div className="w-full max-w-sm p-4">
        <div className="text-center mb-8">
            <div className="inline-block">
              <Logo className="mx-auto h-14 w-14 text-black dark:text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mt-2 text-black dark:text-white">LeadFlowAI</h1>
            <p className="text-muted-foreground mt-2">
              Sign in to access your dashboard
            </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="admin@example.com" required value={email} onChange={e => setEmail(e.target.value)} className="bg-white dark:bg-zinc-900"/>
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link href="#" className="ml-auto inline-block text-sm underline">
                Forgot your password?
              </Link>
            </div>
            <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="bg-white dark:bg-zinc-900" />
          </div>
          <Button type="submit" className="w-full text-base font-semibold">
            Login
          </Button>
          <Button variant="secondary" className="w-full" asChild>
            <Link href="/register">
              Sign up
            </Link>
          </Button>
        </form>
      </div>
    </div>
  );
}
