'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, Package, XCircle } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import {
  useCollection,
  useFirestore,
} from '@/firebase';
import type { Lead } from '@/lib/types';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function IntegrationStatus() {
  const firestore = useFirestore();

  const leadsQuery = useMemo(
    () => query(collection(firestore, 'leads'), orderBy('createdAt', 'desc')),
    [firestore]
  );
  
  const { data: leads, isLoading: leadsLoading } = useCollection<Lead>(leadsQuery);

  const integrationStatus = useMemo(() => {
    if (!leads) return { status: 'loading', lastLead: null, total: 0 };
    if (leads.length === 0) return { status: 'waiting', lastLead: null, total: 0 };
    
    return {
      status: 'connected',
      lastLead: leads[0],
      total: leads.length,
    }
  }, [leads]);

  const activeCampaigns = useMemo(() => {
    if (!leads) return [];
    const campaignNames = new Set<string>();
    leads.forEach(lead => {
      if (lead.campaignName) {
        campaignNames.add(lead.campaignName);
      }
    });
    return Array.from(campaignNames);
  }, [leads]);
  
  const isLoading = leadsLoading;

  return (
    <div className="space-y-8">
       <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                   {integrationStatus.status === 'connected' ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <XCircle className="h-6 w-6 text-red-500" />}
                   État de l'Intégration
                </CardTitle>
                <CardDescription>
                   Aperçu de la synchronisation des leads via Zapier.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="text-sm text-muted-foreground">Chargement des données...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Statut</p>
                             <div className="flex items-center gap-2 mt-1">
                                {integrationStatus.status === 'connected' ? (
                                    <span className="text-lg font-semibold text-green-600">Connecté</span>
                                ) : (
                                    <span className="text-lg font-semibold text-destructive">En attente de leads</span>
                                )}
                            </div>
                        </div>
                         <div>
                            <p className="text-sm font-medium text-muted-foreground">Dernier prospect reçu le</p>
                            {integrationStatus.lastLead?.createdAt ? (
                                <p className="text-lg font-semibold">
                                    {format(integrationStatus.lastLead.createdAt.toDate(), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                                </p>
                            ) : (
                                <p className="text-lg font-semibold">-</p>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
         </Card>
      
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Package className="h-6 w-6 text-primary" />
                    Campagnes Actives
                </CardTitle>
                <CardDescription>
                    Voici la liste de toutes les campagnes qui ont envoyé des prospects dans le CRM.
                </CardDescription>
            </CardHeader>
            <CardContent>
               {isLoading ? (
                  <p className="text-sm text-muted-foreground text-center p-4">Chargement des campagnes...</p>
                ) : activeCampaigns.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom de la Campagne</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeCampaigns.map((campaignName) => (
                                <TableRow key={campaignName}>
                                    <TableCell className="font-medium">{campaignName}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                    <p>Aucune campagne n'a encore envoyé de prospect.</p>
                    <p className="text-sm">Assurez-vous que votre 'Zap' est bien activé et configuré.</p>
                </div>
              )}
            </CardContent>
        </Card>
    </div>
  );
}
