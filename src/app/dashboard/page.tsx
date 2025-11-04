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
import type { Lead, Collaborator, LeadTier } from '@/lib/types';
import { collection, query, where, writeBatch, doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FileUp, Trash2, UserPlus, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { LeadImportDialog, type AllScoreRules } from './_components/lead-import-dialog';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { BulkAssignDialog } from './_components/bulk-assign-dialog';
import { LeadDetailDialog } from './_components/lead-detail-dialog';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { leadStatuses, leadTiers } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


// Simple CSV parser
export const parseCSV = (content: string): { headers: string[], rows: { [key: string]: string }[] } => {
    const lines = content.trim().split('\n').map(row => row.trim()).filter(Boolean);
    if (lines.length < 1) return { headers: [], rows: [] };
    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
    
    const rows = lines.slice(1).map(lineStr => {
      // Basic split, doesn't handle quotes containing delimiters
      const values = lineStr.split(delimiter).map(v => v.trim().replace(/"/g, ''));
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index];
        return obj;
      }, {} as { [key: string]: string });
    });

    return { headers, rows };
};


export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [viewingLeadId, setViewingLeadId] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('All');

  const leadsQuery = useMemoFirebase(() => {
    if (!user) return null;
    let q = query(collection(firestore, 'leads'));
    if (statusFilter !== 'All') {
      q = query(q, where('status', '==', statusFilter));
    }
     if (tierFilter !== 'All') {
      q = query(q, where('tier', '==', tierFilter));
    }
    if (assigneeFilter !== 'All') {
      const assigneeId = assigneeFilter === 'Unassigned' ? null : assigneeFilter;
      q = query(q, where('assignedCollaboratorId', '==', assigneeId));
    }
    return q;
  }, [user, firestore, statusFilter, assigneeFilter, tierFilter]);

  const collaboratorsQuery = useMemoFirebase(
    () => collection(firestore, 'collaborators'),
    [firestore]
  );

  const { data: leads, isLoading: leadsLoading } = useCollection<Lead>(leadsQuery);
  const { data: collaborators, isLoading: collaboratorsLoading } =
    useCollection<Collaborator>(collaboratorsQuery);
  
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    if (!searchTerm) return leads;
    return leads.filter(lead => 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [leads, searchTerm]);

  const isLoading = leadsLoading || collaboratorsLoading;
  
  const leadIds = useMemo(() => filteredLeads?.map(l => l.id) || [], [filteredLeads]);

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
  
  const handleSaveLead = async (data: { fileContent: string; mapping: { [key: string]: string }, scoreColumns: string[], allScoreRules: AllScoreRules }) => {
    const { fileContent, mapping, scoreColumns, allScoreRules } = data;
    if (!firestore) return;
    
    try {
      const { rows } = parseCSV(fileContent);
      if (rows.length === 0) {
        toast({ variant: 'destructive', title: 'Fichier vide', description: 'Aucune donnée à importer.' });
        return;
      }
      
      const batch = writeBatch(firestore);
      const leadsColRef = collection(firestore, 'leads');
      
      const invertedMapping: { [key: string]: string } = {};
      for (const key in mapping) {
          if (mapping[key] !== 'ignore') {
             invertedMapping[mapping[key]] = key;
          }
      }
      
      const rulesLookup: { [column: string]: { [value: string]: number } } = {};
      let maxTotalScore = 0;
      
      for (const column of scoreColumns) {
        let maxColumnScore = 0;
        rulesLookup[column] = allScoreRules[column]?.reduce((acc, rule) => {
          acc[rule.value] = rule.score;
          if (rule.score > maxColumnScore) {
            maxColumnScore = rule.score;
          }
          return acc;
        }, {} as {[key: string]: number}) || {};
        maxTotalScore += maxColumnScore;
      }


      for (const row of rows) {
        const newLeadDocRef = doc(leadsColRef);
        
        let leadTotalScore = 0;
        if(scoreColumns.length > 0) {
          for (const column of scoreColumns) {
              const value = row[column];
              const columnRules = rulesLookup[column];
              if (value && columnRules && columnRules[value] !== undefined) {
                  leadTotalScore += columnRules[value];
              }
          }
        }
        
        const finalScore = (scoreColumns.length > 0 && maxTotalScore > 0) ? Math.round((leadTotalScore / maxTotalScore) * 100) : null;
        
        let tier: LeadTier | null = null;
        if (finalScore !== null) {
          if (finalScore > 70) tier = 'Excellent';
          else if (finalScore >= 40) tier = 'Moyen';
          else tier = 'Faible';
        }
        
        const newLead: Omit<Lead, 'id'> = {
          name: row[invertedMapping['name']] || "Lead sans nom",
          phone: row[invertedMapping['phone']] || null,
          email: row[invertedMapping['email']] || null,
          company: row[invertedMapping['company']] || null,
          username: null,
          status: 'New',
          tier: tier,
          score: finalScore,
          leadData: JSON.stringify(row),
          assignedCollaboratorId: null,
        };
        batch.set(newLeadDocRef, newLead);
      }

      await batch.commit();

      toast({
        title: "Importation réussie !",
        description: `${rows.length} lead(s) ont été importés.`,
      });

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher par nom ou email..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
             <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filtrer par tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Tous les tiers</SelectItem>
                {leadTiers.map(tier => (
                  <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Tous les statuts</SelectItem>
                {leadStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-full lg:col-start-4">
                <SelectValue placeholder="Filtrer par assigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Toutes les personnes</SelectItem>
                <SelectItem value="Unassigned">Non assigné</SelectItem>
                {collaborators?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                        checked={leadIds.length > 0 && selectedLeads.length === leadIds.length ? true : selectedLeads.length > 0 ? 'indeterminate' : false}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        aria-label="Select all"
                        />
                    </TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Assigné à</TableHead>
                    <TableHead className="text-right">
                        <span className="sr-only">Actions</span>
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredLeads && filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => {
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
                            <TableCell>
                                {lead.score !== null ? (
                                    <span className={cn("font-semibold",
                                        lead.score > 70 ? 'text-green-600' :
                                        lead.score >= 40 ? 'text-orange-500' :
                                        'text-red-600'
                                    )}>
                                        {lead.score}%
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">N/A</span>
                                )}
                            </TableCell>
                            <TableCell>
                                {lead.tier ? (
                                    <Badge variant={
                                        lead.tier === 'Excellent' ? 'default' :
                                        lead.tier === 'Moyen' ? 'secondary' :
                                        'destructive'
                                    } className={cn(
                                        lead.tier === 'Excellent' && 'bg-green-600 hover:bg-green-700',
                                        lead.tier === 'Moyen' && 'bg-orange-500 hover:bg-orange-600',
                                        lead.tier === 'Faible' && 'bg-red-600 hover:bg-red-700'
                                    )}>
                                        {lead.tier}
                                    </Badge>
                                ) : (
                                    <span className="text-muted-foreground">N/A</span>
                                )}
                            </TableCell>
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
                            <Button onClick={() => setViewingLeadId(lead.id)} variant="outline" size="sm">
                                Voir
                            </Button>
                            </TableCell>
                        </TableRow>
                        );
                    })
                    ) : (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">
                          {leads?.length === 0 ? "Aucun lead. Commencez par en importer !" : "Aucun lead ne correspond à vos filtres."}
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

      {viewingLeadId && (
        <LeadDetailDialog 
          leadId={viewingLeadId}
          isOpen={!!viewingLeadId}
          onClose={() => setViewingLeadId(null)}
        />
      )}
    </>
  );
}
