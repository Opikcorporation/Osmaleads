'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  useCollection,
  useFirestore,
  updateDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  doc,
} from 'firebase/firestore';
import type { Collaborator } from '@/lib/types';
import { useState, useMemo } from 'react';
import { CollaboratorFormDialog } from './_components/collaborator-form-dialog';
import { CollaboratorCreatedDialog } from './_components/collaborator-created-dialog';
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
import { useToast } from '@/hooks/use-toast';

export default function AdminCollaboratorsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);

  const [isCreatedDialogOpen, setIsCreatedDialogOpen] = useState(false);
  const [newlyCreatedData, setNewlyCreatedData] = useState<{ profile: Collaborator, generatedPassword?: string } | null>(null);

  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'collaborator'>('all');

  const collaboratorsQuery = useMemo(
    () => collection(firestore, 'collaborators'),
    [firestore]
  );

  const { data: allCollaborators, isLoading: collaboratorsLoading } =
    useCollection<Collaborator>(collaboratorsQuery);

  const filteredCollaborators = useMemo(() => {
    if (!allCollaborators) {
      return [];
    }
    if (filterRole === 'all') {
      return allCollaborators;
    }
    return allCollaborators.filter(c => c.role === filterRole);
  }, [allCollaborators, filterRole]);


  const handleOpenFormDialog = (collaborator: Collaborator | null = null) => {
    setEditingCollaborator(collaborator);
    setIsFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    setIsFormDialogOpen(false);
    setEditingCollaborator(null);
  };
  
  const handleCloseCreatedDialog = () => {
    setIsCreatedDialogOpen(false);
    setNewlyCreatedData(null);
  }

  const handleSaveCollaborator = async (data: any) => {
    handleCloseFormDialog();
    
    // --- MODE ÉDITION ---
    if (editingCollaborator) {
      const collaboratorRef = doc(firestore, 'collaborators', editingCollaborator.id);
      const updatedData = { 
          name: data.name, 
          role: data.role,
          avatarColor: data.avatarColor,
      };
      updateDocumentNonBlocking(collaboratorRef, updatedData);
      toast({
          title: 'Collaborateur mis à jour',
          description: `Le profil de ${data.name} a été mis à jour.`,
      });
    } 
    // --- MODE CRÉATION ---
    else {
        try {
            const response = await fetch('/api/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            // First, check if the response was successful.
            if (!response.ok) {
              // If not, try to parse the error JSON, but handle cases where it might fail.
              let errorMessage = `Erreur HTTP ${response.status}: La création a échoué.`;
              try {
                  const errorResult = await response.json();
                  errorMessage = errorResult.error || errorMessage;
              } catch (e) {
                  // This catches "Unexpected end of JSON input" if the error response isn't JSON.
                  console.error("Could not parse error response JSON:", e);
              }
              throw new Error(errorMessage);
            }
            
            // If response is OK, we expect JSON.
            const result = await response.json();

            toast({
                title: 'Collaborateur créé',
                description: `${data.name} a été ajouté. Voici ses identifiants.`,
            });
            setNewlyCreatedData({ profile: result.profile, generatedPassword: result.generatedPassword });
            setIsCreatedDialogOpen(true);

        } catch (error: any) {
            console.error('Error creating collaborator:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur lors de la création',
                description: error.message || 'Une erreur inconnue est survenue.',
            });
        }
    }
  };

  const handleDeleteCollaborator = async (collaboratorId: string, collaboratorName: string) => {
    try {
      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: collaboratorId }),
      });

      if (response.ok) {
        let resultMessage = `L'utilisateur ${collaboratorName} a été supprimé.`;
        try {
          const result = await response.json();
          resultMessage = result.message || resultMessage;
        } catch (e) {
          // Response was ok but had no body, which is fine for a successful delete
        }
        
        toast({
          variant: 'destructive',
          title: 'Collaborateur supprimé',
          description: resultMessage,
        });
      } else {
        let errorDetails = `Erreur HTTP ${response.status}`;
        try {
          const errorResult = await response.json();
          errorDetails = errorResult.error || errorResult.details || errorDetails;
        } catch (e) {
          errorDetails = `La requête a échoué avec le statut ${response.status}.`;
        }
        throw new Error(errorDetails);
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
       toast({
        variant: 'destructive',
        title: 'Erreur de suppression',
        description: error.message || 'Impossible de supprimer cet utilisateur.',
      });
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  }

  if (collaboratorsLoading) {
    return <div>Chargement des collaborateurs...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-3xl">Gérer les Utilisateurs</h1>
        <Button onClick={() => handleOpenFormDialog()} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" /> <span className="hidden md:inline">Créer un Collaborateur</span><span className="md:hidden">Créer</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                  <CardTitle>Utilisateurs</CardTitle>
                  <CardDescription>
                    Créez, modifiez et gérez les comptes des utilisateurs.
                  </CardDescription>
              </div>
              <Tabs onValueChange={(value) => setFilterRole(value as any)} defaultValue="all">
                  <TabsList>
                      <TabsTrigger value="all">Tous</TabsTrigger>
                      <TabsTrigger value="admin">Admins</TabsTrigger>
                      <TabsTrigger value="collaborator">Collabs</TabsTrigger>
                  </TabsList>
              </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCollaborators?.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback style={{ backgroundColor: c.avatarColor }} className="text-white font-bold">
                        {getInitials(c.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-muted-foreground">@{c.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-xs md:text-sm font-medium capitalize bg-muted px-2 py-1 rounded-md">{c.role}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenFormDialog(c)}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Modifier</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Supprimer</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Le compte de <strong>{c.name}</strong> sera définitivement supprimé,
                          ainsi que son profil. Les leads qui lui sont assignés ne seront pas supprimés mais devront être réassignés.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCollaborator(c.id, c.name)}>
                          Oui, supprimer ce collaborateur
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
             {filteredCollaborators.length === 0 && !collaboratorsLoading && (
                <div className="text-center p-8 text-muted-foreground">
                    Aucun collaborateur ne correspond à ce filtre.
                </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CollaboratorFormDialog
        isOpen={isFormDialogOpen}
        onClose={handleCloseFormDialog}
        onSave={handleSaveCollaborator}
        collaborator={editingCollaborator}
      />
      
      {newlyCreatedData && (
        <CollaboratorCreatedDialog
            isOpen={isCreatedDialogOpen}
            onClose={handleCloseCreatedDialog}
            profile={newlyCreatedData.profile}
            generatedPassword={newlyCreatedData.generatedPassword}
        />
      )}
    </>
  );
}
