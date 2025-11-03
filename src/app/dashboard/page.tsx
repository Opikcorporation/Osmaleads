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
import { collection, query, writeBatch, doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FileUp, Trash2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { LeadImportDialog } from './_components/lead-import-dialog';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { BulkAssignDialog } from './_components/bulk-assign-dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  const { toast } = useToast();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const isLoading = leadsLoading || collaboratorsLoading;
  
  const leadIds = useMemo(() => leads?.map(l => l.id) || [], [leads]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedLeads(leadIds);
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };
  
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
      newLeadIds.forEach(leadId => triggerAiAnalysis(leadId));

    } catch (error) {
      console.error("Failed to parse or save leads:", error);
      toast({
        variant: "destructive",
        title: "Erreur lors de l'importation",
        description: "La lecture du CSV ou la sauvegarde a échoué. Vérifiez le format du fichier et la console.",
      });
    }
  };
  
  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0 || !firestore) return;
    setIsProcessing(true);
    const batch = writeBatch(firestore);
    selectedLeads.forEach(leadId => {
      const leadRef = doc(firestore, 'leads', leadId);
      batch.delete(leadRef);
    });
    try {
      await batch.commit();
      toast({
        variant: 'destructive',
        title: `${selectedLeads.length} lead(s) supprimé(s)`,
        description: "Les leads sélectionnés ont été supprimés.",
      });
      setSelectedLeads([]);
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast({
        variant: 'destructive',
        title: "Erreur de suppression",
        description: "La suppression groupée a échoué.",
      });
    } finally {
        setIsProcessing(false);
    }
  }
  
  const handleBulkAssign = async (collaboratorId: string) => {
    if (selectedLeads.length === 0 || !firestore) return;
    setIsProcessing(true);
    const batch = writeBatch(firestore);
    selectedLeads.forEach(leadId => {
      const leadRef = doc(firestore, 'leads', leadId);
      batch.update(leadRef, { assignedCollaboratorId: collaboratorId, status: 'New' });
    });
    
    try {
      await batch.commit();
      const assignee = getAssignee(collaboratorId);
      toast({
        title: "Assignation réussie",
        description: `${selectedLeads.length} lead(s) assigné(s) à ${assignee?.name}.`,
      });
      setSelectedLeads([]);
      setIsAssignDialogOpen(false);
    } catch (error) {
        console.error("Bulk assign failed:", error);
        toast({
            variant: 'destructive',
            title: "Erreur d'assignation",
            description: "L'assignation groupée a échoué.",
        });
    } finally {
        setIsProcessing(false);
    }
  }


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
          {selectedLeads.length > 0 && (
             <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/50 p-3">
                 <p className="text-sm font-medium">{selectedLeads.length} lead(s) sélectionné(s)</p>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsAssignDialogOpen(true)} disabled={isProcessing}>
                        <UserPlus className="mr-2 h-4 w-4" /> Assigner
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isProcessing}>
                                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Cette action est irréversible. {selectedLeads.length} lead(s) seront définitivement supprimé(s).
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handleBulkDelete}>Supprimer</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 </div>
             </div>
          )}
          {isLoading ? (
            <div className="text-center">Chargement des leads...</div>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead padding="checkbox" className="w-12">
                        <Checkbox
                        checked={selectedLeads.length > 0 && selectedLeads.length === leadIds.length ? true : selectedLeads.length > 0 ? 'indeterminate' : false}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        aria-label="Select all"
                        />
                    </TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Assigné à</TableHead>
                    <TableHead className="text-right">
                        <span className="sr-only">Actions</span>
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads && leads.length > 0 ? (
                    leads.map((lead) => {
                        const assignee = getAssignee(lead.assignedCollaboratorId);
                        const isSelected = selectedLeads.includes(lead.id);
                        return (
                        <TableRow key={lead.id} data-state={isSelected ? "selected" : ""}>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                                    aria-label="Select row"
                                />
                            </TableCell>
                            <TableCell className="font-medium">{lead.name}</TableCell>
                            <TableCell className="hidden md:table-cell">{lead.phone || 'N/A'}</TableCell>
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
                        <TableCell colSpan={6} className="text-center h-24">
                        Aucun lead à afficher. Importez votre premier lead pour commencer.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <LeadImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSave={handleSaveLead}
      />
      
      <BulkAssignDialog
        isOpen={isAssignDialogOpen}
        onClose={() => setIsAssignDialogOpen(false)}
        onAssign={handleBulkAssign}
        collaborators={collaborators || []}
        isProcessing={isProcessing}
      />
    </>
  );
}
