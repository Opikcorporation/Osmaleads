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
import type { Lead, LeadStatus, LeadTier } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

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
    label: 'Non Intéressé',
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

export default function AnalysePage() {
  const firestore = useFirestore();
  const leadsQuery = useMemo(
    () => collection(firestore, 'leads'),
    [firestore]
  );
  const { data: leads, isLoading } = useCollection<Lead>(leadsQuery);

  const stats = useMemo(() => {
    if (!leads) {
      return {
        totalLeads: 0,
        qualifiedLeads: 0,
        signedLeads: 0,
        qualificationRate: 0,
      };
    }
    const totalLeads = leads.length;
    const qualifiedLeads = leads.filter((l) => l.status === 'Qualified').length;
    const signedLeads = leads.filter((l) => l.status === 'Signed').length;
    const processedLeads = leads.filter(l => l.status === 'Qualified' || l.status === 'Not Qualified').length;
    const qualificationRate = processedLeads > 0 ? (qualifiedLeads / processedLeads) * 100 : 0;


    return {
      totalLeads,
      qualifiedLeads,
      signedLeads,
      qualificationRate,
    };
  }, [leads]);
  
  const leadsByStatus = useMemo(() => {
    if (!leads) return [];
    const statusCounts = leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
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


  if (isLoading) {
    return <div>Chargement des données d'analyse...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Analyse des Leads</h1>
      </div>
      <p className="text-muted-foreground">
        Visualisez la performance et la répartition de vos leads.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <CardDescription>
              Pourcentage de leads qualifiés parmi les leads traités.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.qualificationRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Leads Signés</CardTitle>
            <CardDescription>
              Nombre total de leads ayant atteint le statut "Signé".
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.signedLeads}</p>
          </CardContent>
        </Card>
      </div>

       <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Répartition par Statut</CardTitle>
                    <CardDescription>Nombre de leads pour chaque statut.</CardDescription>
                </CardHeader>
                <CardContent>
                <ChartContainer config={chartConfigStatus} className="min-h-[200px] w-full">
                    <BarChart data={leadsByStatus} accessibilityLayer>
                        <XAxis
                            dataKey="status"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => chartConfigStatus[value as LeadStatus]?.label || value}
                        />
                        <YAxis />
                        <Tooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                        />
                        <Bar dataKey="leads" radius={4} />
                    </BarChart>
                </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Répartition par Tier</CardTitle>
                    <CardDescription>Proportion des leads par tier de qualité.</CardDescription>
                </CardHeader>
                 <CardContent className="flex-1 pb-0">
                    <ChartContainer
                        config={chartConfigTier}
                        className="mx-auto aspect-square max-h-[300px]"
                    >
                        <PieChart>
                            <Tooltip content={<ChartTooltipContent nameKey="leads" hideLabel />} />
                            <Pie data={leadsByTier} dataKey="leads" nameKey="tier" />
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    </>
  );
}
