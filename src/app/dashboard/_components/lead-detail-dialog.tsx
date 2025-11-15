'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Lead } from '@/lib/types';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';

interface LeadDetailDialogProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to get phone number from various possible fields
const getPhoneNumber = (lead: Lead | null): string => {
  if (!lead) return 'Aucun numéro trouvé.';

  // 1. Check the primary field
  if (lead.phone) return lead.phone;

  // 2. If not found, parse leadData and check common variations
  try {
    const data = JSON.parse(lead.leadData);
    const phoneNumber = data.telephone || data.phone || data.PHONE;
    if (phoneNumber) return String(phoneNumber);
  } catch (e) {
    // leadData might not be valid JSON, which is okay.
  }

  // 3. If still not found, return a default message
  return 'Numéro non renseigné.';
};


export function LeadDetailDialog({ leadId, isOpen, onClose }: LeadDetailDialogProps) {
  const firestore = useFirestore();

  const leadRef = useMemo(() => {
    return firestore && leadId ? doc(firestore, 'leads', leadId) : null;
  }, [firestore, leadId]);
  
  const { data: lead, isLoading, error } = useDoc<Lead>(leadRef);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fiche détaillée du prospect</DialogTitle>
          <DialogDescription>
            Affichage du numéro de téléphone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {isLoading ? (
            <p>Chargement des informations...</p>
          ) : error ? (
            <p className="text-destructive">Erreur de chargement: {error.message}</p>
          ) : !lead ? (
             <p className="text-destructive">Prospect introuvable.</p>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Numéro de Téléphone</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {getPhoneNumber(lead)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
