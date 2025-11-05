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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/status-badge';
import { ScoreBadge } from '@/components/score-badge';
import { useCollection, useFirestore, useFirebase } from '@/firebase';
import type { Lead, Collaborator, LeadStatus } from '@/lib/types';
import { leadStatuses } from '@/lib/types';
import { collection, query, where, writeBatch, doc } from 'firebase/firestore';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, User, X } from 'lucide-react';
import { LeadImportDialog, AllScoreRules } from './_components/lead-import-dialog';
import { LeadDetailDialog } from './_components/lead-detail-dialog';
import { BulkAssignDialog } from './_components/bulk-assign-dialog';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


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

  return { headers, rows };
};


export default function DashboardPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { collaborator } = useFirebase();

  const [isImporting, setIsImporting] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'All'>('All');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);


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

    return q;
  }, [firestore, collaborator, filterStatus]);

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
    scoreColumns: string[];
    allScoreRules: AllScoreRules;
  }) => {
     if (!firestore) return;
     setIsImporting(false);
     
     toast({
      title: 'Importation en cours...',
      description: 'Analyse du fichier et préparation des leads.',
    });

    try {
        const { rows } = parseCSV(data.fileContent);
        const batch = writeBatch(firestore);

        const leadsToCreate = rows.map(row => {
            const nameMapping = Object.keys(data.mapping).find(h => data.mapping[h] === 'name');
            
            // Calculate score
            let totalScore = 0;
            let scoreCount = 0;
            if (data.scoreColumns.length > 0) {
                data.scoreColumns.forEach(col => {
                    const value = row[col];
                    const rule = data.allScoreRules[col]?.find(r => r.value === value);
                    if (rule && rule.score) {
                        totalScore += parseInt(String(rule.score), 10) || 0;
                        scoreCount++;
                    }
                });
            }
            const finalScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : null;

            // Determine Tier from score
            let tier = null;
            if (finalScore !== null) {
                if(finalScore > 66) tier = 'Haut de gamme';
                else if (finalScore > 33) tier = 'Moyenne gamme';
                else tier = 'Bas de gamme';
            }

            const newLead: Omit<Lead, 'id'> = {
                name: nameMapping ? row[nameMapping] : 'Nom Inconnu',
                email: Object.keys(data.mapping).find(h => data.mapping[h] === 'email') ? row[Object.keys(data.mapping).find(h => data.mapping[h] === 'email')!] : null,
                phone: Object.keys(data.mapping).find(h => data.mapping[h] === 'phone') ? row[Object.keys(data.mapping).find(h => data.mapping[h] === 'phone')!] : null,
                company: Object.keys(data.mapping).find(h => data.mapping[h] === 'company') ? row[Object.keys(data.mapping).find(h => data.mapping[h] === 'company')!] : null,
                username: null,
                status: 'New',
                tier: tier,
                score: finalScore,
                leadData: JSON.stringify(row), // Store original row data
                assignedCollaboratorId: null,
            };
            return newLead;
        });
        
        // Add all leads to a batch
        leadsToCreate.forEach(lead => {
            const newLeadRef = doc(collection(firestore, 'leads'));
            batch.set(newLeadRef, lead);
        });

        await batch.commit();

        toast({
            title: 'Importation réussie !',
            description: `${leadsToCreate.length} leads ont été ajoutés avec succès.`,
        });

    } catch (error) {
        console.error("Failed to import leads:", error);
        toast({
            variant: 'destructive',
            title: 'Erreur d\'importation',
            description: 'Un problème est survenu lors de l\'enregistrement des leads.',
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
            batch.update(leadRef, { assignedCollaboratorId: collaboratorId, status: 'New' });
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
  
  const isAdmin = collaborator?.role === 'admin';
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
           <div className="pt-4">
            <Tabs onValueChange={(value) => setFilterStatus(value as any)} defaultValue="All">
                <TabsList>
                    <TabsTrigger value="All">Tous</TabsTrigger>
                    {leadStatuses.map(status => (
                    <TabsTrigger key={status} value={status}>{status}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
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
                          checked={selectedLeads.length > 0 && selectedLeads.length === leads?.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Nom</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Score</TableHead>
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
                        <TableCell>
                          <ScoreBadge score={lead.score} />
                        </TableCell>
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
                      <TableCell colSpan={isAdmin ? 7 : 6} className="text-center h-24">
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
