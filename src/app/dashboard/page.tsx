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
import { useCollection, useFirestore, useFirebase } from '@/firebase';
import type { Lead, Collaborator, LeadStatus } from '@/lib/types';
import { leadStatuses, leadTiers } from '@/lib/types';
import { collection, query, where, Query, writeBatch, doc } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { LeadImportDialog, AllScoreRules } from './_components/lead-import-dialog';
import { LeadDetailDialog } from './_components/lead-detail-dialog';
import { useToast } from '@/hooks/use-toast';

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

  const leadsQuery = useMemo(() => {
    if (!firestore || !collaborator) {
      return null;
    }

    let q: Query = collection(firestore, 'leads');

    if (collaborator.role !== 'admin') {
      q = query(q, where('assignedCollaboratorId', '==', collaborator.id));
    }

    if (filterStatus !== 'All') {
      q = query(q, where('status', '==', filterStatus));
    }

    return q;
  }, [firestore, collaborator, filterStatus]);

  const { data: leads, isLoading: leadsLoading } = useCollection<Lead>(leadsQuery);
  const { data: allUsers } = useCollection<Collaborator>(collection(firestore, 'collaborators'));

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
                    if (rule) {
                        totalScore += rule.score;
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
            const newLeadRef = collection(firestore, 'leads');
            batch.set(doc(newLeadRef), lead);
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
  
  const isAdmin = collaborator?.role === 'admin';

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
           <Tabs onValueChange={(value) => setFilterStatus(value as any)} defaultValue="All" className="pt-4">
              <TabsList>
                <TabsTrigger value="All">Tous</TabsTrigger>
                {leadStatuses.map(status => (
                  <TabsTrigger key={status} value={status}>{status}</TabsTrigger>
                ))}
              </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <div className="text-center p-8">Chargement des leads...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads && leads.length > 0 ? (
                    leads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        onClick={() => handleOpenLead(lead.id)}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.company}</TableCell>
                        <TableCell>
                          <StatusBadge status={lead.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Détails
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24">
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
        <LeadImportDialog
          isOpen={isImporting}
          onClose={() => setIsImporting(false)}
          onSave={handleSaveImport}
        />
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
