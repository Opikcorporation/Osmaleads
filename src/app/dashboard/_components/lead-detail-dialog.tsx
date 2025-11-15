'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Lead } from '@/lib/types';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LeadDetailDialogProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// Helper to get a field value, checking primary field first, then parsed leadData
const getLeadValue = (lead: Lead, primaryKey: keyof Lead, secondaryKeys: string[]): string => {
    // 1. Check top-level property
    const primaryValue = lead[primaryKey];
    if (primaryValue) return String(primaryValue);

    // 2. Parse leadData and check secondary keys
    try {
        const data = JSON.parse(lead.leadData);
        for (const key of secondaryKeys) {
            if (data[key]) return String(data[key]);
        }
    } catch (e) {
        // leadData might not be valid JSON, which is okay.
    }

    // 3. If still not found, return empty
    return '';
};


export function LeadDetailDialog({ leadId, isOpen, onClose }: LeadDetailDialogProps) {
  const firestore = useFirestore();

  const leadRef = useMemo(() => {
    return firestore && leadId ? doc(firestore, 'leads', leadId) : null;
  }, [firestore, leadId]);
  
  const { data: lead, isLoading, error } = useDoc<Lead>(leadRef);

  const leadName = useMemo(() => {
    if (!lead) return 'Chargement...';
    return getLeadValue(lead, 'name', ['nom', 'FULL NAME', 'Name']) || 'Prospect sans nom';
  }, [lead]);

  const leadPhone = useMemo(() => {
     if (!lead) return '';
     return getLeadValue(lead, 'phone', ['telephone', 'phone', 'PHONE']);
  }, [lead]);

  const allLeadData = useMemo(() => {
    if (!lead?.leadData) return null;
    try {
        const data = JSON.parse(lead.leadData);
        // Filter out empty or null values for a cleaner display
        return Object.entries(data).filter(([, value]) => value !== null && value !== '');
    } catch {
        return null;
    }
  }, [lead]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{leadName}</DialogTitle>
          <DialogDescription>
            {leadPhone || 'Numéro de téléphone non renseigné.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {isLoading ? (
            <p>Chargement des informations...</p>
          ) : error ? (
            <p className="text-destructive">Erreur de chargement: {error.message}</p>
          ) : !lead ? (
             <p className="text-center text-destructive p-8">Le prospect est introuvable ou les données sont corrompues.</p>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations Complètes</CardTitle>
                <DialogDescription>Voici toutes les données brutes reçues du formulaire.</DialogDescription>
              </CardHeader>
              <CardContent>
                {allLeadData && allLeadData.length > 0 ? (
                    <ScrollArea className="h-72">
                        <div className="space-y-3 pr-4">
                            {allLeadData.map(([key, value]) => (
                                <div key={key} className="grid grid-cols-3 gap-4 text-sm">
                                    <dt className="font-medium text-muted-foreground truncate">{key}</dt>
                                    <dd className="col-span-2 text-foreground">{String(value)}</dd>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <p className="text-sm text-muted-foreground text-center p-4">Aucune donnée brute disponible pour ce prospect.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
