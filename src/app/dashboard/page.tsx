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
  addDocumentNonBlocking
} from '@/firebase';
import type { Lead, Collaborator } from '@/lib/types';
import { collection, query, serverTimestamp } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FileUp } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { LeadImportDialog } from './_components/lead-import-dialog';
import { useToast } from '@/hooks/use-toast';
import { generateLeadProfile, getTierFromScore } from '@/ai/flows/generate-lead-profile';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const { toast } = useToast();

  // Determine the query based on the user's role
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
  
  const handleSaveLead = async ({ leadData, fileName }: { leadData: string, fileName: string }) => {
    if (!firestore) return;
    setIsImportDialogOpen(false); // Close dialog immediately
    toast({
      title: "Analyse IA en cours...",
      description: "Le profil et le score du lead sont en cours de génération.",
    });

    try {
      // 1. Generate AI Profile and Score and structured data
      const { profile, score, scoreRationale, name, company, email, phone, username } = await generateLeadProfile({ leadData });
      const tier = await getTierFromScore(score);

      // 2. Create lead object
      const newLead: Omit<Lead, 'id'> = {
        name: name || `Lead importé - ${fileName.replace(/\.[^/.]+$/, "")}`, // Use AI name, fallback to filename
        email: email || "non fourni",
        company: company || "non fourni",
        phone: phone || "non fourni",
        username: username || "non fourni",
        createdAt: serverTimestamp(),
        status: 'New',
        assignedCollaboratorId: null,
        aiProfile: profile,
        leadData: leadData,
        score: score,
        scoreRationale: scoreRationale,
        tier: tier,
      };

      // 3. Save to Firestore
      const leadsColRef = collection(firestore, 'leads');
      await addDocumentNonBlocking(leadsColRef, newLead);

      toast({
        title: "Lead créé avec succès !",
        description: `${newLead.name} a été ajouté avec un score de ${score}.`,
      });

    } catch (error) {
      console.error("Failed to generate profile or save lead:", error);
      toast({
        variant: "destructive",
        title: "Erreur lors de la création du lead",
        description: "L'analyse IA ou la sauvegarde a échoué. Vérifiez la console pour plus de détails.",
      });
    }

  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-500 text-white';
    if (score >= 50) return 'bg-yellow-500 text-black';
    return 'bg-red-500 text-white';
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
                  <TableHead>Score</TableHead>
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
                          <Badge className={getScoreBadgeColor(lead.score)}>{lead.score}</Badge>
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
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/leads/${lead.id}`}>Voir</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
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
