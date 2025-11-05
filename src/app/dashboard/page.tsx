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
  useFirebase,
} from '@/firebase';
import type { Lead } from '@/lib/types';
import { collection, query } from 'firebase/firestore';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { LeadImportDialog } from './_components/lead-import-dialog';
import { useToast } from '@/hooks/use-toast';
import { LeadDetailDialog } from './_components/lead-detail-dialog';

/**
 * Parses a CSV string into an object with headers and rows.
 * @param csvString The CSV content as a string.
 * @returns An object containing an array of headers and an array of row objects.
 */
export const parseCSV = (csvString: string): { headers: string[], rows: Record<string, string>[] } => {
  const lines = csvString.split(/\r\n|\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index]?.trim() || '';
      return obj;
    }, {} as Record<string, string>);
  });

  return { headers, rows };
}


export default function DashboardPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isImporting, setIsImporting] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const leadsQuery = query(collection(firestore, 'leads'));
  const { data: leads, isLoading: leadsLoading } = useCollection<Lead>(leadsQuery);

  const handleOpenLead = (leadId: string) => {
    setSelectedLeadId(leadId);
  };
  
  const handleCloseLead = () => {
    setSelectedLeadId(null);
  }

  const handleSaveImport = async (data: any) => {
    console.log('Import data:', data);
    toast({
      title: 'Importation démarrée',
      description: 'Les leads seront traités en arrière-plan.',
    });
    setIsImporting(false);
  };
  
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Tableau de Bord des Leads</h1>
         <Button onClick={() => setIsImporting(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Importer des Leads
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Tous les Leads
          </CardTitle>
          <CardDescription>
            Voici la liste de tous les leads dans le système.
          </CardDescription>
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
                        <TableRow key={lead.id} onClick={() => handleOpenLead(lead.id)} className="cursor-pointer">
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
                            Aucun lead à afficher. Commencez par en importer.
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
        isOpen={isImporting}
        onClose={() => setIsImporting(false)}
        onSave={handleSaveImport}
      />
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
