
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollection, useFirestore, useFirebase } from '@/firebase';
import type { Lead, Collaborator, LeadStatus, LeadTier } from '@/lib/types';
import { collection, Timestamp } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LabelList } from 'recharts';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, startOfQuarter, endOfQuarter, startOfToday, endOfToday, startOfYesterday, endOfYesterday } from 'date-fns';


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

const periodOptions = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'yesterday', label: 'Hier' },
    { value: 'this_month', label: 'Ce mois-ci' },
    { value: 'last_month', label: 'Le mois précédent' },
    { value: 'last_3_months', label: 'Les 3 derniers mois' },
    { value: 'this_year', label: 'Cette année' },
    { value: 'all_time', label: 'Toujours' },
];

// Helper function to reliably get the creation date from a lead object
const getCreationDate = (l: Lead): Date | null => {
  if (l.createdAt && l.createdAt instanceof Timestamp) {
    return l.createdAt.toDate();
  }
  
  let dateString: string | undefined | null = null;
  
  if ((l as any).created_time) {
    dateString = (l as any).created_time;
  } else if ((l as any)['Created Time']) {
    dateString = (l as any)['Created Time'];
  } else if (l.leadData) {
    try {
      const parsedData = JSON.parse(l.leadData);
      dateString = parsedData.created_time || parsedData['Created Time'];
    } catch (e) {
      // It's okay if parsing fails, we'll try other fields.
    }
  }
  
  if (dateString && typeof dateString === 'string') {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
};

// Helper function to reliably get the campaign name
const getCampaignName = (l: Lead): string => {
    let campaign = l.campaignName || (l as any).nom_campagne || (l as any)['Form Name'];
    if (!campaign && l.leadData) {
        try {
            const parsedData = JSON.parse(l.leadData);
            campaign = parsedData.nom_campagne || parsedData['Form Name'];
        } catch(e) { /* ignore */ }
    }
    return campaign || 'Inconnue';
}


export default function AnalysePage() {
  const firestore = useFirestore();
  const { collaborator } = useFirebase();
  const isAdmin = collaborator?.role === 'admin';
  const [period, setPeriod] = useState('this_month');
  
  const leadsQuery = useMemo(
    () => collection(firestore, 'leads'),
    [firestore]
  );
  const { data: allLeads, isLoading: leadsLoading } = useCollection<Lead>(leadsQuery);
  
  const usersQuery = useMemo(
    () => collection(firestore, 'collaborators'),
    [firestore]
  );
  const { data: collaboratorsData, isLoading: usersLoading } = useCollection<Collaborator>(usersQuery);

  const relevantLeads = useMemo(() => {
      if (!allLeads || !collaborator) return [];
      if (isAdmin) {
          return allLeads;
      }
      return allLeads.filter(lead => lead.assignedCollaboratorId === collaborator.id);
  }, [allLeads, collaborator, isAdmin]);

  const filteredLeads = useMemo(() => {
    if (!relevantLeads) return [];
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case 'today':
        startDate = startOfToday();
        endDate = endOfToday();
        break;
      case 'yesterday':
        startDate = startOfYesterday();
        endDate = endOfYesterday();
        break;
      case 'this_month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'last_month':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case 'last_3_months':
        startDate = startOfMonth(subMonths(now, 2));
        endDate = endOfMonth(now);
        break;
      case 'this_year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'all_time':
      default:
        return relevantLeads;
    }

    return relevantLeads.filter(lead => {
      const leadDate = getCreationDate(lead);
      if (leadDate) {
        return leadDate >= startDate && leadDate <= endDate;
      }
      return false;
    });
  }, [relevantLeads, period]);

  const stats = useMemo(() => {
    if (!filteredLeads) {
      return {
        totalLeads: 0,
        qualificationRate: 0,
        signatureRate: 0,
        signedLeads: 0,
      };
    }
    const totalLeads = filteredLeads.length;
    const qualifiedLeads = filteredLeads.filter(l => l.status === 'Qualified').length;
    const signedLeads = filteredLeads.filter(l => l.status === 'Signed').length;
    const processedLeads = filteredLeads.filter(l => l.status === 'Qualified' || l.status === 'Not Qualified').length;
    
    const qualificationRate = processedLeads > 0 ? (qualifiedLeads / processedLeads) * 100 : 0;
    const signatureRate = totalLeads > 0 ? (signedLeads / totalLeads) * 100 : 0;

    return {
      totalLeads,
      qualificationRate,
      signatureRate,
      signedLeads,
    };
  }, [filteredLeads]);
  
  const leadsByStatus = useMemo(() => {
    if (!filteredLeads) return [];
    const statusCounts = filteredLeads.reduce((acc, lead) => {
        const status = lead.status || 'New';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<LeadStatus, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        leads: count,
        fill: chartConfigStatus[status as LeadStatus]?.color || 'hsl(var(--muted))'
    }));
  }, [filteredLeads]);

  const leadsByTier = useMemo(() => {
     if (!filteredLeads) return [];
     const tierCounts = filteredLeads.reduce((acc, lead) => {
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
  }, [filteredLeads]);

  const leadsByCampaign = useMemo(() => {
    if (!filteredLeads) return [];
    const campaignCounts = filteredLeads.reduce((acc, lead) => {
      const campaignName = getCampaignName(lead);
      acc[campaignName] = (acc[campaignName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(campaignCounts).map(([campaign, count]) => ({
      name: campaign,
      leads: count,
    }));
  }, [filteredLeads]);

  const performanceByCollaborator = useMemo(() => {
    if (!filteredLeads || !collaboratorsData) return [];
    
    const collaboratorStats = collaboratorsData.map(c => {
        const assignedLeads = filteredLeads.filter(l => l.assignedCollaboratorId === c.id);
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

    return collaboratorStats.filter(c => c.total > 0);
  }, [filteredLeads, collaboratorsData]);

  const isLoading = leadsLoading || usersLoading;

  if (isLoading) {
    return <div>Chargement des données d'analyse...</div>;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 className="text-xl font-semibold md:text-3xl">Analyse des Performances</h1>
            <p className="text-sm text-muted-foreground">
                {isAdmin ? 'Visualisez la performance globale des campagnes et des collaborateurs.' : 'Visualisez la performance de vos leads assignés.'}
            </p>
        </div>
        <div className="w-full sm:w-auto">
            <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="min-w-[180px]">
                    <SelectValue placeholder="Sélectionner une période" />
                </SelectTrigger>
                <SelectContent>
                    {periodOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>
      

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total des Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taux de Qualification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.qualificationRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads Signés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.signedLeads}</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle className="text-base">Taux de Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.signatureRate.toFixed(1)}%</p>
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

        {isAdmin && (
            <>
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
                                        interval={0}
                                        tick={({ x, y, payload }) => (
                                          <g transform={`translate(${x},${y})`}>
                                            <text x={0} y={0} dy={16} textAnchor="end" fill="#666" transform="rotate(-35)">
                                              {payload.value.length > 15 ? payload.value.substring(0, 15) + '...' : payload.value}
                                            </text>
                                          </g>
                                        )}
                                        height={60}
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
        )}
    </>
  );
}
