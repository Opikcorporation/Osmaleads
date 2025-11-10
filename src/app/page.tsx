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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/status-badge';
import { ScoreBadge } from '@/components/score-badge';
import { useCollection, useFirestore, useFirebase } from '@/firebase';
import type { Lead, Collaborator, LeadStatus, LeadTier } from '@/lib/types';
import { leadStatuses, leadTiers } from '@/lib/types';
import { collection, query, where, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, User, X, Trash2 } from 'lucide-react';
import { LeadImportDialog } from './dashboard/_components/lead-import-dialog';
import { LeadDetailDialog } from './dashboard/_components/lead-detail-dialog';
import { BulkAssignDialog } from './dashboard/_components/bulk-assign-dialog';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { qualifyLead } from '@/ai/flows/qualify-lead-flow';


export const parseCSV = (
  csvString: string
): { headers: string[]; rows: Record<string, string>[] } => {
  const lines = csvString
    .split(/\r\n|\n/)
    .filter((line) => line.trim() !== '');
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    // A more robust way to handle commas inside quoted fields
    const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
    return headers.reduce((obj, header, index) => {
      const value = values[index]?.trim().replace(/"/g, '') || '';
      obj[header] = value;
      return obj;
    }, {} as Record<string, string>);
  });

  return { headers: [], rows };
};


export default function DashboardPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { collaborator } = useFirebase();

  // --- FIX EST ICI ---
  const isAdmin = collaborator?.role === 'admin';

  const [isImporting, setIsImporting] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'All'>('All');
  const [filterTier, setFilterTier] = useState<LeadTier | 'All'>('All');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);

  // La ligne "isAdmin" a été retirée d'ici

  const leadsQuery = useMemo(() => {
    // ** THE GUARD **: Do not create a query if we don't have a fully authenticated user and profile.
    if (!firestore || !collaborator) {
      return null;
    }

    let q = query(collection(firestore, 'leads'));

    if (collaborator.role !== 'admin') {
      q = query(q, where('assignedCollaboratorId', '==', collaborator.id));
    }

    if (filterStatus !== 'All') {
      q = query(q, where('status', '==', filterStatus));
    }
    
    if (isAdmin && filterTier !== 'All') {
        q = query(q, where('tier', '==', filterTier));
    }

    return q;
  }, [firestore, collaborator, filterStatus, filterTier, isAdmin]);

  const { data: leads, isLoading: leadsLoading } = useCollection<Lead>(leadsQuery);
  const { data: allUsers, isLoading: usersLoading } = useCollection<Collaborator>(collection(firestore, 'collaborators'));
  
  const collaborators = useMemo(() => allUsers?.filter(u => u.role === 'collaborator') || [], [allUsers]);
  
  const getCollaboratorById = (id: string): Collaborator | undefined => {
    return allUsers?.find(u => u.id === id);
  }

  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  }

  const handleOpenLead = (leadId: string) => {
    setSelectedLeadId(leadId);
  };

  const handleCloseLead = () => {
    setSelectedLeadId(null);
  };

  const handleSaveImport = async (data: {
    fileContent: string;
    mapping: { [key: string]: string };
  }) => {
     if (!firestore) return;
     setIsImporting(false);
     
     toast({
      title: 'Qualification IA en cours...',
      description: 'Analyse du fichier et qualification de chaque lead. Cela peut prendre un moment.',
    });

    try {
        const { rows } = parseCSV(data.fileContent);
        const batch = writeBatch(firestore);

        for (const row of rows) {
          const leadDataString = JSON.stringify(row);
          
          // --- AI QUALIFICATION ---
          const aiQualification = await qualifyLead({ leadData: leadDataString });

          const nameMapping = Object.keys(data.mapping).find(h => data.mapping[h] === 'name');

          const newLead: Omit<Lead, 'id'> = {
              name: nameMapping ? row[nameMapping] : 'Nom Inconnu',
              email: Object.keys(data.mapping).find(h => data.mapping[h] === 'email') ? row[Object.keys(data.mapping).find(h => data.mapping[h] === 'email')!] : null,
              phone: Object.keys(data.mapping).find(h => data.mapping[h] === 'phone') ? row[Object.keys(data.mapping).find(h => data.mapping[h] === 'phone')!] : null,
              company: Object.keys(data.mapping).find(h => data.mapping[h] === 'company') ? row[Object.keys(data.mapping).find(h => data.mapping[h] === 'company')!] : null,
              username: null,
              status: 'New',
              tier: aiQualification.tier,
              score: aiQualification.score,
              leadData: leadDataString, // Store original row data
              assignedCollaboratorId: null,
              createdAt: serverTimestamp(),
              campaignId: null,
              campaignName: null,
          };
          
          const newLeadRef = doc(collection(firestore, 'leads'));
          batch.set(newLeadRef, newLead);
        }

        await batch.commit();

        toast({
            title: 'Importation réussie !',
            description: `${rows.length} leads ont été qualifiés par l'IA et ajoutés avec succès.`,
        });

    } catch (error) {
        console.error("Failed to import leads:", error);
        toast({
            variant: 'destructive',
            title: 'Erreur d\'importation',
            description: 'Un problème est survenu lors de la qualification ou de l\'enregistrement des leads.',
        });
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(leads?.map(l => l.id) || []);
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectOne = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };
  
  const handleBulkAssign = async (collaboratorId: string) => {
    if (!firestore || selectedLeads.length === 0) return;
    setIsAssigning(true);

    try {
        const batch = writeBatch(firestore);
        selectedLeads.forEach(leadId => {
            const leadRef = doc(firestore, 'leads', leadId);
            batch.update(leadRef, { assignedCollaboratorId: collaboratorId, status: 'New', assignedAt: serverTimestamp() });
        });
        await batch.commit();
        toast({
            title: 'Assignation réussie',
            description: `${selectedLeads.length} lead(s) assigné(s) avec succès.`,
        });
        setSelectedLeads([]); // Clear selection
    } catch(error) {
        toast({
            variant: 'destructive',
            title: 'Erreur d\'assignation',
            description: 'Un problème est survenu lors de l\'assignation des leads.',
        });
    } finally {
        setIsAssigning(false);
        setIsBulkAssignDialogOpen(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedLeads.length === 0) return;

    try {
        const batch = writeBatch(firestore);
        selectedLeads.forEach(leadId => {
            const leadRef = doc(firestore, 'leads', leadId);
            batch.delete(leadRef);
        });
        await batch.commit();
        toast({
            variant: 'destructive',
            title: 'Suppression réussie',
            description: `${selectedLeads.length} lead(s) ont été supprimé(s).`,
        });
        setSelectedLeads([]); // Clear selection
    } catch(error) {
        toast({
            variant: 'destructive',
            title: 'Erreur de suppression',
            description: 'Un problème est survenu lors de la suppression des leads.',
        });
    }
  };
  
  const isLoading = leadsLoading || usersLoading;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">
          Tableau de Bord des Leads
        </h1>
        {isAdmin && (
          <Button onClick={() => setIsImporting(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Importer des Leads
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>
                {isAdmin ? 'Tous les Leads' : 'Mes Leads Assignés'}
              </CardTitle>
              <CardDescription>
                {isAdmin
                  ? 'Voici la liste de tous les leads dans le système.'
                  : 'Voici la liste des leads qui vous ont été assignés.'}
              </CardDescription>
            </div>
          </div>
           <div className="pt-4 flex flex-wrap gap-4">
            <Tabs onValueChange={(value) => setFilterStatus(value as any)} defaultValue="All">
                <TabsList>
                    <TabsTrigger value="All">Tous les statuts</TabsTrigger>
                    {leadStatuses.map(status => (
                    <TabsTrigger key={status} value={status}>{status}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
            {isAdmin && (
                <Tabs onValueChange={(value) => setFilterTier(value as any)} defaultValue="All">
                    <TabsList>
                        <TabsTrigger value="All">Tous les tiers</TabsTrigger>
                        {leadTiers.map(tier => (
                        <TabsTrigger key={tier} value={tier}>{tier}</TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isAdmin && selectedLeads.length > 0 && (
             <div className="bg-muted p-3 rounded-lg mb-4 flex items-center justify-between">
                <span className="text-sm font-medium">{selectedLeads.length} lead(s) sélectionné(s)</span>
                <div className="space-x-2">
                    <Button size="sm" onClick={() => setIsBulkAssignDialogOpen(true)}>
                        <User className="mr-2 h-4 w-4" />
                        Assigner
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. {selectedLeads.length} lead(s) seront définitivement supprimés.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={handleBulkDelete}>
                            Oui, supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedLeads([])}>
                        <X className="mr-2 h-4 w-4"/>
                        Annuler
                    </Button>
                </div>
            </div>
          )}
          {isLoading ? (
            <div className="text-center p-8">Chargement des leads...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     {isAdmin && (
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedLeads.length > 0 && !!leads && selectedLeads.length === leads.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Nom</TableHead>
                    <TableHead>Téléphone</TableHead>
                    {isAdmin && <TableHead>Score</TableHead>}
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
                      const assignedCollaborator = lead.assignedCollaboratorId ? getCollaboratorById(lead.assignedCollaboratorId) : null;
                      return (
                      <TableRow
                        key={lead.id}
                        data-state={selectedLeads.includes(lead.id) ? 'selected' : ''}
                        className="cursor-pointer"
                        onClick={(e) => {
                            // Prevents row click from triggering when clicking on checkbox
                            if ((e.target as HTMLElement).closest('[role="checkbox"]')) return;
                            handleOpenLead(lead.id)
                        }}
                      >
                         {isAdmin && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedLeads.includes(lead.id)}
                              onCheckedChange={(checked) => handleSelectOne(lead.id, !!checked)}
                              aria-label={`Select lead ${lead.name}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.phone || '-'}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <ScoreBadge score={lead.score} />
                          </TableCell>
                        )}
                        <TableCell>
                          <StatusBadge status={lead.status} />
                        </TableCell>
                        <TableCell>
                          {assignedCollaborator ? (
                             <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarFallback style={{ backgroundColor: assignedCollaborator.avatarColor }} className="text-white text-xs font-bold">
                                        {getInitials(assignedCollaborator.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{assignedCollaborator.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Détails
                          </Button>
                        </TableCell>
                      </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 5} className="text-center h-24">
                        Aucun lead à afficher pour ce filtre.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <>
            <LeadImportDialog
            isOpen={isImporting}
            onClose={() => setIsImporting(false)}
            onSave={handleSaveImport}
            />
            <BulkAssignDialog
                isOpen={isBulkAssignDialogOpen}
                onClose={() => setIsBulkAssignDialogOpen(false)}
                onAssign={handleBulkAssign}
                collaborators={collaborators}
                isProcessing={isAssigning}
            />
        </>
      )}

      {selectedLeadId && (
        <LeadDetailDialog
          leadId={selectedLeadId}
          isOpen={!!selectedLeadId}
          onClose={handleCloseLead}
        />
      )}
    </>
  );
}
