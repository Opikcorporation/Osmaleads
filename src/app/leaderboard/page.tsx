'use client';

import { useCollection, useFirestore, useFirebase } from '@/firebase';
import type { Lead, Collaborator } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Award, Crown } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
}

export default function LeaderboardPage() {
  const firestore = useFirestore();
  const { user, collaborator, isLoading: isAuthLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if auth is done and there's no user.
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [isAuthLoading, user, router]);

  // --- QUERIES CONDITIONNELLES ---
  // Only create queries when authentication is resolved and successful.
  const leadsQuery = useMemo(() => {
    if (isAuthLoading || !user) return null; // Ne pas exécuter si l'auth est en cours ou si l'utilisateur n'est pas connecté
    return collection(firestore, 'leads');
  }, [firestore, isAuthLoading, user]);

  const usersQuery = useMemo(() => {
    if (isAuthLoading || !user) return null; // Idem pour les collaborateurs
    return collection(firestore, 'collaborators');
  }, [firestore, isAuthLoading, user]);


  const { data: leads, isLoading: leadsLoading } = useCollection<Lead>(leadsQuery);
  const { data: collaborators, isLoading: usersLoading } = useCollection<Collaborator>(usersQuery);

  const leaderboards = useMemo(() => {
    if (!leads || !collaborators) {
      return { topSellers: [], topQualifiers: [] };
    }

    const collaboratorStats = collaborators.map(c => {
      const assignedLeads = leads.filter(l => l.assignedCollaboratorId === c.id);
      const signedLeads = assignedLeads.filter(l => l.status === 'Signed').length;
      const qualifiedLeads = assignedLeads.filter(l => l.status === 'Qualified').length;
      const totalLeads = assignedLeads.length;
      const qualificationRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;
      
      return {
        ...c,
        signedLeads,
        qualificationRate,
        qualifiedLeadsCount: qualifiedLeads
      };
    });

    const topSellers = [...collaboratorStats]
      .filter(c => c.signedLeads > 0)
      .sort((a, b) => b.signedLeads - a.signedLeads)
      .slice(0, 20);

    const topQualifiers = [...collaboratorStats]
      .filter(c => c.qualificationRate > 0)
      .sort((a, b) => b.qualificationRate - a.qualificationRate)
      .slice(0, 20);

    return { topSellers, topQualifiers };
  }, [leads, collaborators]);

  // Combined loading state
  const isLoading = isAuthLoading || leadsLoading || usersLoading;

  // Initial loading state or if user is being redirected.
  if (isAuthLoading || !collaborator) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <p className="text-2xl font-semibold animate-pulse">Chargement de la session...</p>
      </div>
    );
  }

  const getRankColor = (rank: number) => {
    if (rank === 0) return 'text-yellow-400';
    if (rank === 1) return 'text-gray-400';
    if (rank === 2) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  return (
    <main className="min-h-screen w-full bg-muted/40 p-8">
      <header className="text-center mb-12">
        <div className="flex items-center justify-center gap-4">
          <Image src="/logo.png" alt="Osmaleads Logo" width={200} height={50} />
        </div>
        <h1 className="text-5xl font-bold tracking-tighter mt-4">Classement des Performances</h1>
        <p className="text-xl text-muted-foreground mt-2">Mise à jour en temps réel</p>
      </header>
      {isLoading ? (
        <div className="text-center"><p>Chargement du classement...</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <Trophy className="mx-auto h-12 w-12 text-yellow-500" />
              <CardTitle className="text-3xl font-bold mt-2">Top 20 Vendeurs</CardTitle>
              <CardDescription className="text-lg">Basé sur le nombre de leads avec le statut "Signé".</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboards.topSellers.map((seller, index) => (
                  <div key={seller.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <div className="flex items-center gap-4">
                      <span className={`text-3xl font-bold w-10 text-center ${getRankColor(index)}`}>
                          {index === 0 ? <Crown className="mx-auto h-8 w-8" /> : index + 1}
                      </span>
                      <Avatar className="h-12 w-12 border-2 border-primary">
                        <AvatarFallback style={{ backgroundColor: seller.avatarColor }} className="text-white font-bold">{getInitials(seller.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xl font-semibold">{seller.name}</p>
                        <p className="text-md text-muted-foreground">@{seller.username}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">{seller.signedLeads} <span className="text-base font-normal text-muted-foreground">ventes</span></p>
                  </div>
                ))}
                {leaderboards.topSellers.length === 0 && <p className="text-center text-lg text-muted-foreground p-8">Aucune vente enregistrée pour le moment.</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <Award className="mx-auto h-12 w-12 text-green-500" />
              <CardTitle className="text-3xl font-bold mt-2">Top 20 Qualifieurs</CardTitle>
              <CardDescription className="text-lg">Basé sur le taux de conversion en leads "Qualifié".</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboards.topQualifiers.map((qualifier, index) => (
                  <div key={qualifier.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <div className="flex items-center gap-4">
                      <span className={`text-3xl font-bold w-10 text-center ${getRankColor(index)}`}>
                          {index === 0 ? <Crown className="mx-auto h-8 w-8" /> : index + 1}
                      </span>
                      <Avatar className="h-12 w-12 border-2 border-primary">
                        <AvatarFallback style={{ backgroundColor: qualifier.avatarColor }} className="text-white font-bold">{getInitials(qualifier.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xl font-semibold">{qualifier.name}</p>
                        <p className="text-md text-muted-foreground">@{qualifier.username}</p>
                      </div>
                    </div>
                     <p className="text-2xl font-bold">{qualifier.qualificationRate.toFixed(1)}%</p>
                  </div>
                ))}
                {leaderboards.topQualifiers.length === 0 && <p className="text-center text-lg text-muted-foreground p-8">Aucun lead qualifié pour le moment.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
