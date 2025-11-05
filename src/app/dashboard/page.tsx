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
import { collection, query, where, Query } from 'firebase/firestore';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { collaborator } = useFirebase(); // The layout guarantees this is loaded.
  
  const [leadsQuery, setLeadsQuery] = useState<Query | null>(null);

  // This effect will run once the collaborator object is stable.
  useEffect(() => {
    if (!firestore || !collaborator) {
      return; // Wait for firestore and collaborator to be available
    }

    let q = query(collection(firestore, 'leads'));
    
    // If the user is a collaborator, they can only see leads assigned to them.
    // The firestore.rules are also updated to enforce this.
    if (collaborator.role === 'collaborator') {
      q = query(q, where('assignedCollaboratorId', '==', collaborator.id));
    }
    
    // For an admin, the query remains unfiltered, listing all leads.
    setLeadsQuery(q);

  }, [firestore, collaborator]);


  const { data: leads, isLoading: leadsLoading } = useCollection<Lead>(leadsQuery);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Tableau de Bord des Leads</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {collaborator?.role === 'admin' ? 'Tous les Leads' : 'Mes Leads'}
          </CardTitle>
          <CardDescription>
            Voici la liste de vos leads.
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
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">
                          <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads && leads.length > 0 ? (
                      leads.map((lead) => (
                        <TableRow key={lead.id}>
                            <TableCell className="font-medium">{lead.name}</TableCell>
                            <TableCell>
                              <StatusBadge status={lead.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              {/* Actions can be added back here later */}
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                      <TableRow>
                          <TableCell colSpan={3} className="text-center h-24">
                            Aucun lead à afficher.
                          </TableCell>
                      </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
