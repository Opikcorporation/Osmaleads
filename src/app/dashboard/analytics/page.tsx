'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import type { Lead, Collaborator, LeadStatus, LeadTier } from '@/lib/types';
import { collection, query, where, doc } from 'firebase/firestore';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Target, CheckCircle, Award, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge';

const tierColors: Record<LeadTier, string> = {
  'Haut de gamme': '#16a34a', // green-600
  'Moyenne gamme': '#f59e0b', // amber-500
  'Bas de gamme': '#dc2626', // red-600
};

const statusColors: Record<LeadStatus, string> = {
  New: '#3b82f6', // blue-500
  Qualified: '#22c55e', // green-500
  'Not Qualified': '#ef4444', // red-500
  'No Answer': '#eab308', // yellow-500
  'Not Interested': '#f97316', // orange-500
  Signed: '#8b5cf6', // violet-500
};

export default function AnalyticsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const collaboratorRef = useMemo(() => user ? doc(firestore, 'collaborators', user.uid) : null, [user, firestore]);
  const { data: collaborator, isLoading: isProfileLoading } = useDoc<Collaborator>(collaboratorRef);

  const leadsQuery = useMemo(() => {
    if (!collaborator) {
      return null;
    }

    let q = query(collection(firestore, 'leads'));
    // If user is a collaborator, only show their leads
    if (collaborator.role === 'collaborator') {
        q = query(q, where('assignedCollaboratorId', '==', collaborator.id));
    }
    return q;
  }, [firestore, collaborator]);

  const collaboratorsQuery = useMemo(() => 
    (collaborator?.role === 'admin') ? collection(firestore, 'collaborators') : null,
    [firestore, collaborator]
  );

  const { data: leads, isLoading: leadsLoading } = useCollection<Lead>(leadsQuery);
  const { data: collaborators, isLoading: collaboratorsLoading } = useCollection<Collaborator>(collaboratorsQuery);
  
  const isLoading = leadsLoading || collaboratorsLoading || isProfileLoading;

  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  }

  const kpiData = useMemo(() => {
    if (!leads) return null;
    const totalLeads = leads.length;
    const qualifiedLeads = leads.filter(l => l.status === 'Qualified').length;
    const signedLeads = leads.filter(l => l.status === 'Signed').length;
    
    let averageScore: number | null = 0;
    if (collaborator?.role === 'admin') {
      const leadsWithScore = leads.filter(l => typeof l.score === 'number');
      averageScore = leadsWithScore.length > 0 
        ? leadsWithScore.reduce((sum, l) => sum + (l.score || 0), 0) / leadsWithScore.length 
        : 0;
    } else {
      averageScore = null;
    }
    
    return {
      totalLeads,
      qualificationRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
      signedLeads,
      averageScore,
    };
  }, [leads, collaborator]);

  const leadsByStatusData = useMemo(() => {
    if (!leads) return [];
    const statusCounts = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<LeadStatus, number>);
    
    return Object.entries(statusCounts).map(([name, value]) => ({ name: name as LeadStatus, value }));
  }, [leads]);
  
  const leadsByTierData = useMemo(() => {
    if (!leads || collaborator?.role !== 'admin') return [];
    const tierCounts = leads.reduce((acc, lead) => {
      const tier = lead.tier || 'Bas de gamme'; // Default if tier is null/undefined
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {} as Record<LeadTier, number>);
    
    return Object.entries(tierCounts).map(([name, value]) => ({ name: name as LeadTier, value }));
  }, [leads, collaborator]);
  
  const collaboratorPerformanceData = useMemo(() => {
    if (!leads || !collaborators || collaborator?.role !== 'admin') return [];
    return collaborators
        .filter(c => c.role === 'collaborator')
        .map(c => {
            const assignedLeads = leads.filter(l => l.assignedCollaboratorId === c.id);
            const signedLeads = assignedLeads.filter(l => l.status === 'Signed').length;
            const conversionRate = assignedLeads.length > 0 ? (signedLeads / assignedLeads.length) * 100 : 0;
            return {
                collaborator: c,
                assignedCount: assignedLeads.length,
                signedCount: signedLeads,
                conversionRate: conversionRate,
            }
        })
        .sort((a,b) => b.signedCount - a.signedCount || b.conversionRate - a.conversionRate);
  }, [leads, collaborators, collaborator]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <p>Chargement des analyses...</p>
      </div>
    );
  }

  if (!kpiData) {
     return <div className="text-center">Aucune donnée de lead à analyser.</div>
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Analyse & Performance</h1>
      </div>
       <p className="text-muted-foreground">
        {collaborator?.role === 'admin' ? 
          'Visualisez les métriques clés de votre acquisition de leads.' :
          'Visualisez les métriques clés de vos leads assignés.'
        }
      </p>

      {/* KPI Cards */}
      <div className={cn("mt-4 grid gap-4 md:grid-cols-2", collaborator?.role === 'admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total des Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              {collaborator?.role === 'admin' ? 'Nombre total de leads importés' : 'Nombre de leads qui vous sont assignés'}
            </p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Qualification</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.qualificationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Pourcentage de leads qualifiés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Signés</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{kpiData.signedLeads}</div>
            <p className="text-xs text-muted-foreground">Nombre total de contrats signés</p>
          </CardContent>
        </Card>
        {collaborator?.role === 'admin' && kpiData.averageScore !== null && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score Moyen</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiData.averageScore.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">Qualité moyenne des leads</p>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Charts */}
      <div className={cn("mt-6 grid gap-6 md:grid-cols-1", collaborator?.role === 'admin' && "lg:grid-cols-5")}>
        <Card className={cn(collaborator?.role === 'admin' && "lg:col-span-2")}>
           <CardHeader>
            <CardTitle>Répartition par Statut</CardTitle>
             <CardDescription>Distribution des leads à travers leur cycle de vie.</CardDescription>
          </CardHeader>
          <CardContent>
             <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={leadsByStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5}>
                  {leadsByStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={statusColors[entry.name]} />
                  ))}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                        return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">Statut</span>
                                <span className="font-bold text-muted-foreground">{payload[0].name}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">Total</span>
                                <span className="font-bold">{payload[0].value}</span>
                            </div>
                            </div>
                        </div>
                        )
                    }
                    return null
                 }}/>
                 <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        {collaborator?.role === 'admin' && (
             <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Répartition par Qualité</CardTitle>
                <CardDescription>Nombre de leads pour chaque tier de qualité.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={leadsByTierData}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`}/>
                        <Tooltip cursor={{fill: 'hsla(var(--muted))'}} content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                        <p className="font-bold">{`${label} : ${payload[0].value} leads`}</p>
                                    </div>
                                )
                            }
                            return null
                        }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {leadsByTierData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={tierColors[entry.name]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
        )}
      </div>

       {/* Collaborator Performance */}
      {collaborator?.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Performance par Collaborateur</CardTitle>
            <CardDescription>Classement basé sur les leads signés et le taux de conversion.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Collaborateur</TableHead>
                          <TableHead>Leads Assignés</TableHead>
                          <TableHead>Leads Signés</TableHead>
                          <TableHead className="text-right">Taux de Conversion</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {collaboratorPerformanceData?.map(data => (
                          <TableRow key={data.collaborator.id}>
                              <TableCell>
                                  <div className="flex items-center gap-3">
                                      <Avatar>
                                          <AvatarFallback style={{ backgroundColor: data.collaborator.avatarColor }} className="text-white font-bold">
                                              {getInitials(data.collaborator.name)}
                                          </AvatarFallback>
                                      </Avatar>
                                      <div>
                                          <p className="font-medium">{data.collaborator.name}</p>
                                          <p className="text-sm text-muted-foreground">{data.collaborator.username}</p>
                                      </div>
                                  </div>
                              </TableCell>
                              <TableCell>{data.assignedCount}</TableCell>
                              <TableCell>{data.signedCount}</TableCell>
                              <TableCell className="text-right">
                                  <Badge className={cn("font-semibold",
                                      data.conversionRate > 50 ? 'bg-green-100 text-green-800' :
                                      data.conversionRate > 20 ? 'bg-amber-100 text-amber-800' :
                                      'bg-red-100 text-red-800'
                                  )}>{data.conversionRate.toFixed(1)}%</Badge>
                              </TableCell>
                          </TableRow>
                      ))}
                      {collaboratorPerformanceData?.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={4} className="text-center h-24">Aucun collaborateur à analyser.</TableCell>
                          </TableRow>
                      )}
                  </TableBody>
            </Table>
          </CardContent>
        </Card>
       )}
    </>
  );
}
