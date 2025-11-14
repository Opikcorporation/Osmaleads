'use client';

import { useCollection, useFirestore, useFirebase } from '@/firebase';
import type { Lead, Collaborator } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Award, Crown } from 'lucide-react';
import Image from 'next/image';

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

  const leadsQuery = useMemo(() => collection(firestore, 'leads'), [firestore]);
  const usersQuery = useMemo(() => collection(firestore, 'collaborators'), [firestore]);

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

  const isLoading = leadsLoading || usersLoading;

  const getRankColor = (rank: number) => {
    if (rank === 0) return 'text-yellow-400';
    if (rank === 1) return 'text-gray-400';
    if (rank === 2) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  return (
    <>
      <header className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tighter mt-4">Classement des Performances</h1>
        <p className="text-lg md:text-xl text-muted-foreground mt-2">Mise à jour en temps réel</p>
      </header>
      {isLoading ? (
        <div className="text-center"><p>Chargement du classement...</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader className="text-center">
              <Trophy className="mx-auto h-10 w-10 md:h-12 md:w-12 text-yellow-500" />
              <CardTitle className="text-2xl md:text-3xl font-bold mt-2">Top 20 Vendeurs</CardTitle>
              <CardDescription className="md:text-lg">Basé sur le nombre de leads avec le statut "Signé".</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboards.topSellers.map((seller, index) => (
                  <div key={seller.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <div className="flex items-center gap-3">
                      <span className={`text-xl md:text-3xl font-bold w-8 md:w-10 text-center ${getRankColor(index)}`}>
                          {index === 0 ? <Crown className="mx-auto h-6 w-6 md:h-8 md:w-8" /> : index + 1}
                      </span>
                      <Avatar className="h-10 w-10 md:h-12 md:w-12 border-2 border-primary">
                        <AvatarFallback style={{ backgroundColor: seller.avatarColor }} className="text-white font-bold">{getInitials(seller.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-base md:text-xl font-semibold">{seller.name}</p>
                        <p className="text-sm md:text-md text-muted-foreground">@{seller.username}</p>
                      </div>
                    </div>
                    <p className="text-xl md:text-2xl font-bold">{seller.signedLeads} <span className="text-sm md:text-base font-normal text-muted-foreground">ventes</span></p>
                  </div>
                ))}
                {leaderboards.topSellers.length === 0 && <p className="text-center text-lg text-muted-foreground p-8">Aucune vente enregistrée pour le moment.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Award className="mx-auto h-10 w-10 md:h-12 md:w-12 text-green-500" />
              <CardTitle className="text-2xl md:text-3xl font-bold mt-2">Top 20 Qualifieurs</CardTitle>
              <CardDescription className="md:text-lg">Basé sur le taux de conversion en leads "Qualifié".</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboards.topQualifiers.map((qualifier, index) => (
                  <div key={qualifier.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <div className="flex items-center gap-3">
                      <span className={`text-xl md:text-3xl font-bold w-8 md:w-10 text-center ${getRankColor(index)}`}>
                          {index === 0 ? <Crown className="mx-auto h-6 w-6 md:h-8 md:w-8" /> : index + 1}
                      </span>
                      <Avatar className="h-10 w-10 md:h-12 md:w-12 border-2 border-primary">
                        <AvatarFallback style={{ backgroundColor: qualifier.avatarColor }} className="text-white font-bold">{getInitials(qualifier.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-base md:text-xl font-semibold">{qualifier.name}</p>
                        <p className="text-sm md:text-md text-muted-foreground">@{qualifier.username}</p>
                      </div>
                    </div>
                     <p className="text-xl md:text-2xl font-bold">{qualifier.qualificationRate.toFixed(1)}%</p>
                  </div>
                ))}
                {leaderboards.topQualifiers.length === 0 && <p className="text-center text-lg text-muted-foreground p-8">Aucun lead qualifié pour le moment.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
