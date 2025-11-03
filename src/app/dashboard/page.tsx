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
import { StatusBadge } from '@/components/status-badge';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import type { Lead, Collaborator } from '@/lib/types';
import { collection, query, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FileUp } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { LeadImportDialog } from './_components/lead-import-dialog';
import { useToast } from '@/hooks/use-toast';

// Simple CSV parser
const parseCSV = (content: string): { [key: string]: string }[] => {
  const rows = content.trim().split('\n');
  if (rows.length < 2) return [];
  const headers = rows[0].split(',').map(h => h.trim());
  return rows.slice(1).map(row => {
    const values = row.split(',').map(v => v.trim());
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index];
      return obj;
    }, {} as { [key: string]: string });
  });
};

// Function to find a key in a case-insensitive way
const findKey = (obj: any, keys: string[]): string | null => {
    const lowerCaseKeys = keys.map(k => k.toLowerCase());
    for (const key in obj) {
        if (lowerCaseKeys.includes(key.toLowerCase())) {
            return obj[key];
        }
    }
    return null;
}

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const { toast } = useToast();

  const leadsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'leads'));
  }, [user, firestore]);

  const collaboratorsQuery = useMemoFirebase(
    () => collection(firestore, 'collaborators'),
    [firestore]
  );

  const { data: leads, isLoading: leadsLoading } = useCollection<Lead>(leadsQuery);
  const { data: collaborators, isLoading: collaboratorsLoading } =
    useCollection<Collaborator>(collaboratorsQuery);

  const getAssignee = (collaboratorId: string | null) => {
    if (!collaboratorId) return null;
    return collaborators?.find((c) => c.id === collaboratorId);
  };
  
  const triggerAiAnalysis = async (leadId: string) => {
    try {
      await fetch('/api/generate-lead-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      // No need to show a toast for each one, as it happens in the background.
    } catch (error) {
      console.error(`Failed to trigger analysis for lead ${leadId}`, error);
    }
  };

  const handleSaveLead = async ({ leadData, fileName }: { leadData: string, fileName: string }) => {
    if (!firestore) return;
    setIsImportDialogOpen(false);
    toast({
      title: "Importation en cours...",
      description: "Traitement du fichier CSV.",
    });

    try {
      const parsedLeads = parseCSV(leadData);
      if (!parsedLeads || parsedLeads.length === 0) {
        toast({
          variant: "destructive",
          title: "Fichier vide ou invalide",
          description: "Le fichier CSV ne contient aucune donnée à importer.",
        });
        return;
      }
      
      const batch = writeBatch(firestore);
      const leadsColRef = collection(firestore, 'leads');
      const newLeadIds: string[] = [];

      for (const row of parsedLeads) {
        const newLeadDocRef = doc(leadsColRef);
        const sensibleName = findKey(row, ["Nom", "Name", "Company", "Societe", "Full Name", "Nom Complet"]) || "Lead importé";

        const newLead: Omit<Lead, 'id'> = {
          name: sensibleName,
          email: null,
          company: null,
          phone: null,
          username: null,
          createdAt: serverTimestamp(),
          status: 'New',
          assignedCollaboratorId: null,
          leadData: JSON.stringify(row),
        };
        batch.set(newLeadDocRef, newLead);
        newLeadIds.push(newLeadDocRef.id);
      }

      await batch.commit();

      toast({
        title: "Importation réussie !",
        description: `${parsedLeads.length} lead(s) ont été créés. L'analyse IA commence en arrière-plan.`,
      });

      // Trigger background analysis for each new lead
      for (const leadId of newLeadIds) {
        triggerAiAnalysis(leadId);
      }

    } catch (error) {
      console.error("Failed to parse or save leads:", error);
      toast({
        variant: "destructive",
        title: "Erreur lors de l'importation",
        description: "La lecture du CSV ou la sauvegarde a échoué. Vérifiez le format du fichier et la console.",
      });
    }
  };

  const isLoading = leadsLoading || collaboratorsLoading;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Tableau de Bord des Leads</h1>
         <Button onClick={() => setIsImportDialogOpen(true)}>
          <FileUp className="mr-2 h-4 w-4" /> Importer des Leads
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tous les Leads</CardTitle>
          <CardDescription>
            Voici la liste de tous les leads dans le système.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center">Chargement des leads...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden md:table-cell">Entreprise</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Assigné à</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads && leads.length > 0 ? (
                  leads.map((lead) => {
                    const assignee = getAssignee(lead.assignedCollaboratorId);
                    return (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{lead.company}</TableCell>
                        <TableCell>
                          <StatusBadge status={lead.status} />
                        </TableCell>
                        <TableCell>
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={assignee.avatarUrl} />
                                <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="hidden sm:inline">{assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Non assigné</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/leads/${lead.id}`}>Voir</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Aucun lead à afficher. Importez votre premier lead pour commencer.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <LeadImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSave={handleSaveLead}
      />
    </>
  );
}
