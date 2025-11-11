'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useCollection, useFirestore } from '@/firebase';
import type { Lead, Collaborator, LeadStatus, LeadTier } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LabelList } from 'recharts';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Award } from 'lucide-react';

const chartConfigStatus = {
  leads: {
    label: 'Leads',
  },
  New: {
    label: 'Nouveau',
    color: 'hsl(var(--chart-1))',
  },
  Qualified: {
    label: 'Qualifié',
    color: 'hsl(var(--chart-2))',
  },
  'Not Qualified': {
    label: 'Non Qualifié',
    color: 'hsl(var(--chart-3))',
  },
  'No Answer': {
    label: 'Sans Réponse',
    color: 'hsl(var(--chart-4))',
  },
   'Not Interested': {
    label: 'Pas Intéressé',
    color: 'hsl(var(--chart-5))',
  },
  Signed: {
    label: 'Signé',
    color: 'hsl(var(--chart-2))',
  },
} satisfies React.ComponentProps<typeof ChartContainer>['config'];

const chartConfigTier = {
  leads: {
    label: 'Leads',
  },
  'Haut de gamme': {
    label: 'Haut de gamme',
    color: 'hsl(var(--chart-1))',
  },
  'Moyenne gamme': {
    label: 'Moyenne gamme',
    color: 'hsl(var(--chart-2))',
  },
  'Bas de gamme': {
    label: 'Bas de gamme',
    color: 'hsl(var(--chart-3))',
  },
} satisfies React.ComponentProps<typeof ChartContainer>['config'];

const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
}

export default function AnalysePage() {
  const firestore = useFirestore();
  
  const leadsQuery = useMemo(
    () => collection(firestore, 'leads'),
    [firestore]
  );
  const { data: leads, isLoading: leadsLoading } = useCollection<Lead>(leadsQuery);
  
  const usersQuery = useMemo(
    () => collection(firestore, 'collaborators'),
    [firestore]
  );
  const { data: collaborators, isLoading: usersLoading } = useCollection<Collaborator>(usersQuery);

  const stats = useMemo(() => {
    if (!leads) {
      return {
        totalLeads: 0,
        qualificationRate: 0,
        signatureRate: 0,
        signedLeads: 0,
      };
    }
    const totalLeads = leads.length;
    const qualifiedLeads = leads.filter(l => l.status === 'Qualified').length;
    const signedLeads = leads.filter(l => l.status === 'Signed').length;
    const processedLeads = leads.filter(l => l.status === 'Qualified' || l.status === 'Not Qualified').length;
    
    const qualificationRate = processedLeads > 0 ? (qualifiedLeads / processedLeads) * 100 : 0;
    const signatureRate = totalLeads > 0 ? (signedLeads / totalLeads) * 100 : 0;

    return {
      totalLeads,
      qualificationRate,
      signatureRate,
      signedLeads,
    };
  }, [leads]);
  
  const leadsByStatus = useMemo(() => {
    if (!leads) return [];
    const statusCounts = leads.reduce((acc, lead) => {
        const status = lead.status || 'New';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<LeadStatus, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        leads: count,
        fill: chartConfigStatus[status as LeadStatus]?.color || 'hsl(var(--muted))'
    }));
  }, [leads]);

  const leadsByTier = useMemo(() => {
     if (!leads) return [];
     const tierCounts = leads.reduce((acc, lead) => {
        if(lead.tier) {
            acc[lead.tier] = (acc[lead.tier] || 0) + 1;
        }
        return acc;
    }, {} as Record<LeadTier, number>);

    return Object.entries(tierCounts).map(([tier, count]) => ({
        tier,
        leads: count,
        fill: chartConfigTier[tier as LeadTier]?.color || 'hsl(var(--muted))'
    }));
  }, [leads]);

  const leadsByCampaign = useMemo(() => {
    if (!leads) return [];
    const campaignCounts = leads.reduce((acc, lead) => {
      const campaignName = lead.campaignName || lead.nom_campagne || 'Inconnue';
      acc[campaignName] = (acc[campaignName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(campaignCounts).map(([campaign, count]) => ({
      name: campaign,
      leads: count,
    }));
  }, [leads]);

  const performanceByCollaborator = useMemo(() => {
    if (!leads || !collaborators) return [];
    
    const collaboratorData = collaborators.map(c => {
        const assignedLeads = leads.filter(l => l.assignedCollaboratorId === c.id);
        const statusCounts = assignedLeads.reduce((acc, lead) => {
            const status = lead.status || 'New';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<LeadStatus, number>);
        
        return {
            name: c.name,
            total: assignedLeads.length,
            ...statusCounts
        }
    });

    return collaboratorData.filter(c => c.total > 0);
  }, [leads, collaborators]);

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

  if (isLoading) {
    return <div>Chargement des données d'analyse...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Analyse des Performances</h1>
      </div>
      <p className="text-muted-foreground">
        Visualisez la performance de vos campagnes, collaborateurs et leads.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total des Leads</CardTitle>
            <CardDescription>Nombre total de leads importés.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.totalLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Taux de Qualification</CardTitle>
            <CardDescription>Leads qualifiés / leads traités.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.qualificationRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Leads Signés</CardTitle>
            <CardDescription>Nombre de contrats signés.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.signedLeads}</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Taux de Signature</CardTitle>
            <CardDescription>Leads signés / total des leads.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.signatureRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

       <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Trophy className="text-yellow-500"/> Meilleurs Vendeurs</CardTitle>
                    <CardDescription>Top 20 des collaborateurs par nombre de leads signés.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {leaderboards.topSellers.map((seller, index) => (
                            <div key={seller.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-lg w-6 text-center">{index + 1}</span>
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback style={{backgroundColor: seller.avatarColor}} className="text-white font-bold">{getInitials(seller.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{seller.name}</p>
                                        <p className="text-sm text-muted-foreground">@{seller.username}</p>
                                    </div>
                                </div>
                                <p className="font-bold text-lg">{seller.signedLeads} <span className="text-sm font-normal text-muted-foreground">ventes</span></p>
                            </div>
                        ))}
                         {leaderboards.topSellers.length === 0 && <p className="text-sm text-muted-foreground text-center p-4">Aucune vente enregistrée pour le moment.</p>}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Award className="text-green-500"/> Meilleurs Qualifieurs</CardTitle>
                    <CardDescription>Top 20 des collaborateurs par taux de qualification des leads.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="space-y-3">
                        {leaderboards.topQualifiers.map((qualifier, index) => (
                            <div key={qualifier.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-lg w-6 text-center">{index + 1}</span>
                                     <Avatar className="h-9 w-9">
                                        <AvatarFallback style={{backgroundColor: qualifier.avatarColor}} className="text-white font-bold">{getInitials(qualifier.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{qualifier.name}</p>
                                        <p className="text-sm text-muted-foreground">@{qualifier.username}</p>
                                    </div>
                                </div>
                                <p className="font-bold text-lg">{qualifier.qualificationRate.toFixed(1)}%</p>
                            </div>
                        ))}
                        {leaderboards.topQualifiers.length === 0 && <p className="text-sm text-muted-foreground text-center p-4">Aucun lead qualifié pour le moment.</p>}
                    </div>
                </CardContent>
            </Card>
        </div>


       <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Répartition par Statut</CardTitle>
                </CardHeader>
                <CardContent>
                <ChartContainer config={chartConfigStatus} className="min-h-[250px] w-full">
                    <BarChart data={leadsByStatus} accessibilityLayer layout="vertical">
                        <CartesianGrid horizontal={false} />
                        <YAxis
                            dataKey="status"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => chartConfigStatus[value as LeadStatus]?.label || value}
                        />
                        <XAxis dataKey="leads" type="number" hide />
                        <Tooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="leads" radius={4}>
                            <LabelList dataKey="leads" position="right" offset={8} className="fill-foreground" fontSize={12} />
                        </Bar>
                    </BarChart>
                </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Répartition par Tier</CardTitle>
                </CardHeader>
                 <CardContent className="flex-1 pb-0">
                    <ChartContainer
                        config={chartConfigTier}
                        className="mx-auto aspect-square max-h-[300px]"
                    >
                        <PieChart>
                            <Tooltip content={<ChartTooltipContent nameKey="leads" hideLabel />} />
                             <Legend
                                content={({ payload }) => {
                                return (
                                    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
                                    {payload?.map((entry) => (
                                        <li key={entry.value} className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span>{chartConfigTier[entry.value as LeadTier]?.label}</span>
                                        </li>
                                    ))}
                                    </ul>
                                )
                                }}
                            />
                            <Pie data={leadsByTier} dataKey="leads" nameKey="tier" labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}/>
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Performance par Campagne</CardTitle>
                    <CardDescription>Nombre de leads générés par chaque campagne.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{}} className="min-h-[300px] w-full">
                        <BarChart data={leadsByCampaign} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="name"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                            />
                            <YAxis />
                            <Tooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Bar dataKey="leads" fill="hsl(var(--primary))" radius={4}>
                                <LabelList dataKey="leads" position="top" offset={8} className="fill-foreground" fontSize={12} />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>

         <div className="mt-6 grid grid-cols-1 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Performance par Collaborateur</CardTitle>
                    <CardDescription>Répartition des statuts des leads pour chaque collaborateur.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfigStatus} className="min-h-[400px] w-full">
                        <BarChart data={performanceByCollaborator} accessibilityLayer layout="vertical">
                            <CartesianGrid horizontal={false} />
                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={10} />
                            <XAxis dataKey="total" type="number" hide />
                            <Tooltip content={<ChartTooltipContent hideLabel />} />
                            <Legend />
                            <Bar dataKey="New" stackId="a" fill={chartConfigStatus.New.color} name={chartConfigStatus.New.label} />
                            <Bar dataKey="Qualified" stackId="a" fill={chartConfigStatus.Qualified.color} name={chartConfigStatus.Qualified.label} />
                            <Bar dataKey="Signed" stackId="a" fill={chartConfigStatus.Signed.color} name={chartConfigStatus.Signed.label} />
                            <Bar dataKey="Not Qualified" stackId="a" fill={chartConfigStatus['Not Qualified'].color} name={chartConfigStatus['Not Qualified'].label} />
                            <Bar dataKey="No Answer" stackId="a" fill={chartConfigStatus['No Answer'].color} name={chartConfigStatus['No Answer'].label} />
                            <Bar dataKey="Not Interested" stackId="a" fill={chartConfigStatus['Not Interested'].color} name={chartConfigStatus['Not Interested'].label} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    </>
  );
}
