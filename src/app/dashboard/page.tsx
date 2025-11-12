
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
import { StatusBadge } from '@/components/status-badge';
import { ScoreBadge } from '@/components/score-badge';
import { useCollection, useFirestore, useFirebase } from '@/firebase';
import type { Lead, Collaborator, LeadStatus, LeadTier } from '@/lib/types';
import { leadStatuses, leadTiers } from '@/lib/types';
import { collection, query, writeBatch, doc, serverTimestamp, Timestamp, orderBy, limit } from 'firebase/firestore';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, User, X, Trash2, CheckSquare } from 'lucide-react';
import { LeadImportDialog } from './_components/lead-import-dialog';
import { LeadDetailDialog } from './_components/lead-detail-dialog';
import { BulkAssignDialog } from './_components/bulk-assign-dialog';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { qualifyLead } from '@/ai/flows/qualify-lead-flow';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
    const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
    return headers.reduce((obj, header, index) => {
      const value = values[index]?.trim().replace(/"/g, '') || '';
      obj[header] = value;
      return obj;
    }, {} as Record<string, string>);
  });

  return { headers, rows };
};


export default function DashboardPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { collaborator } = useFirebase();
  const isAdmin = collaborator?.role === 'admin';

  const [isImporting, setIsImporting] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);

  // --- Simplified Data Fetching ---
  const allLeadsQuery = useMemo(() => firestore ? query(collection(firestore, 'leads'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const { data: allLeads, isLoading: allLeadsLoading, error: leadsError } = useCollection<Lead>(allLeadsQuery);

  const allUsersQuery = useMemo(() => firestore ? collection(firestore, 'collaborators') : null, [firestore]);
  const { data: allUsers, isLoading: usersLoading } = useCollection<Collaborator>(allUsersQuery);

  const collaborators = useMemo(() => allUsers?.filter(u => u.role === 'collaborator') || [], [allUsers]);
  
    const getCreationDate = (l: Lead): Date | null => {
      if (l.createdAt instanceof Timestamp) return l.createdAt.toDate();
      
      let dateString: string | undefined | null = (l as any).created_time || (l as any)['Created Time'];

      if (!dateString && l.leadData) {
        try {
          const parsedData = JSON.parse(l.leadData);
          dateString = parsedData.created_time || parsedData['Created Time'];
        } catch (e) { /* ignore */ }
      }

      if (dateString) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) return date;
      }
      
      return null;
    };
    
    const getCampaignName = (l: Lead): string | null => {
        let campaign = l.campaignName || (l as any).nom_campagne || (l as any)['Form Name'];
        if (!campaign && l.leadData) {
            try {
                const parsedData = JSON.parse(l.leadData);
                campaign = parsedData.nom_campagne || parsedData['Form Name'];
            } catch(e) { /* ignore */ }
        }
        return campaign || null;
    }


  const filteredLeads = useMemo(() => {
    if (!allLeads || !collaborator) {
      return [];
    }
    if (isAdmin) {
      return allLeads;
    }
    return allLeads.filter(
      (lead) => lead.assignedCollaboratorId === collaborator.id
    );
  }, [allLeads, collaborator, isAdmin]);
  
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
      title: 'Qualification en cours...',
      description: 'Analyse du fichier et qualification de chaque lead. Cela peut prendre un moment.',
    });

    try {
        const { rows } = parseCSV(data.fileContent);
        const batch = writeBatch(firestore);

        const qualificationPromises = rows.map(row => {
          const leadDataString = JSON.stringify(row);
          return qualifyLead({ leadData: leadDataString }).then(qualification => ({
            row,
            qualification,
            leadDataString
          }));
        });
        
        const qualifiedRows = await Promise.all(qualificationPromises);

        for (const { row, qualification, leadDataString } of qualifiedRows) {
          const nameMapping = Object.keys(data.mapping).find(h => data.mapping[h] === 'name');

          const newLead: Omit<Lead, 'id'> = {
              name: nameMapping ? row[nameMapping] : 'Nom Inconnu',
              email: Object.keys(data.mapping).find(h => data.mapping[h] === 'email') ? row[Object.keys(data.mapping).find(h => data.mapping[h] === 'email')!] : null,
              phone: Object.keys(data.mapping).find(h => data.mapping[h] === 'phone') ? row[Object.keys(data.mapping).find(h => data.mapping[h] === 'phone')!] : null,
              company: Object.keys(data.mapping).find(h => data.mapping[h] === 'company') ? row[Object.keys(data.mapping).find(h => data.mapping[h] === 'company')!] : null,
              username: null,
              status: 'New',
              tier: qualification.tier,
              score: qualification.score,
              leadData: leadDataString, 
              assignedCollaboratorId: null,
              createdAt: serverTimestamp() as Timestamp,
              campaignId: null,
              campaignName: null,
          };
          
          const newLeadRef = doc(collection(firestore, 'leads'));
          batch.set(newLeadRef, newLead);
        }

        await batch.commit();

        toast({
            title: 'Importation réussie !',
            description: `${rows.length} leads ont été qualifiés et ajoutés avec succès.`,
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
      setSelectedLeads(filteredLeads?.map(l => l.id) || []);
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
        setSelectedLeads([]); 
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
        setSelectedLeads([]); 
    } catch(error) {
        toast({
            variant: 'destructive',
            title: 'Erreur de suppression',
            description: 'Un problème est survenu lors de la suppression des leads.',
        });
    }
  };
  
  const isLoading = allLeadsLoading || usersLoading;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-3xl">
          Tableau de Bord
        </h1>
        {isAdmin && (
          <Button onClick={() => setIsImporting(true)} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Importer
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg md:text-2xl">
                {isAdmin ? 'Tous les Leads' : 'Mes Leads Assignés'}
              </CardTitle>
              <CardDescription className="text-sm">
                {isAdmin
                  ? 'Voici la liste de tous les leads dans le système.'
                  : 'Voici la liste des leads qui vous ont été assignés.'}
              </CardDescription>
            </div>
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
                          checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Nom</TableHead>
                    <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                    {isAdmin && <TableHead className="hidden lg:table-cell">Campagne</TableHead>}
                    {isAdmin && <TableHead className="hidden md:table-cell">Score</TableHead>}
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden lg:table-cell">Assigné à</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads && filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => {
                      const assignedCollaborator = lead.assignedCollaboratorId ? getCollaboratorById(lead.assignedCollaboratorId) : null;
                      const leadName = lead.name || (lead as any).nom || 'Nom Inconnu';
                      const leadPhone = lead.phone || (lead as any).telephone || '-';
                      const leadCampaign = getCampaignName(lead) || '-';
                      const leadStatus = lead.status || 'New';
                      
                      const creationDate = getCreationDate(lead);
                      
                      return (
                      <TableRow
                        key={lead.id}
                        data-state={selectedLeads.includes(lead.id) ? 'selected' : ''}
                        className="cursor-pointer"
                        onClick={(e) => {
                            if ((e.target as HTMLElement).closest('[role="checkbox"]')) return;
                            handleOpenLead(lead.id)
                        }}
                      >
                         {isAdmin && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedLeads.includes(lead.id)}
                              onCheckedChange={(checked) => handleSelectOne(lead.id, !!checked)}
                              aria-label={`Select lead ${leadName}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{leadName}</TableCell>
                        <TableCell className="hidden md:table-cell">{leadPhone}</TableCell>
                         {isAdmin && (
                          <TableCell className="hidden lg:table-cell">
                           {leadCampaign}
                          </TableCell>
                        )}
                        {isAdmin && (
                          <TableCell className="hidden md:table-cell">
                            <ScoreBadge score={lead.score} />
                          </TableCell>
                        )}
                        <TableCell>
                          <StatusBadge status={leadStatus} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
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
                        <TableCell className="hidden lg:table-cell">
                            {creationDate ? (
                                <span className="text-sm text-muted-foreground">
                                    {format(creationDate, "dd/MM/yy HH:mm")}
                                </span>
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
                      <TableCell colSpan={isAdmin ? 9 : 5} className="text-center h-24">
                        { leadsError ? "Une erreur est survenue lors du chargement des leads." : "Aucun lead à afficher." }
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
