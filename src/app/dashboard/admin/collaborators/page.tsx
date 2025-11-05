'use client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);

  const collaboratorsQuery = useMemo(
    () => collection(firestore, 'collaborators'),
    [firestore]
  );

  const { data: collaborators, isLoading: collaboratorsLoading } =
    useCollection<Collaborator>(collaboratorsQuery);

  const handleOpenDialog = (collaborator: Collaborator | null = null) => {
    setEditingCollaborator(collaborator);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCollaborator(null);
  };

  const handleSaveCollaborator = async (data: any) => {
    handleCloseDialog();
    
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

            const result = await response.json();

            if (!response.ok) {
                // L'API a renvoyé une erreur (ex: utilisateur existe déjà)
                throw new Error(result.error || 'Une erreur inconnue est survenue.');
            }

            toast({
                title: 'Collaborateur créé',
                description: `${data.name} a été ajouté avec succès.`,
            });
        } catch (error: any) {
            console.error('Error creating collaborator:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur lors de la création',
                description: error.message,
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Erreur HTTP ${response.status}`);
      }
      
      toast({
        variant: 'destructive',
        title: 'Collaborateur supprimé',
        description: `L'utilisateur ${collaboratorName} a été supprimé définitivement.`,
      });

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
        <h1 className="text-2xl font-semibold md:text-3xl">Gérer les Collaborateurs</h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Créer un Collaborateur
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Collaborateurs</CardTitle>
          <CardDescription>
            Créez, modifiez et gérez les comptes des utilisateurs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {collaborators?.map((c) => (
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
                   <span className="text-sm font-medium capitalize bg-muted px-2 py-1 rounded-md">{c.role}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(c)}>
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
          </div>
        </CardContent>
      </Card>

      <CollaboratorFormDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveCollaborator}
        collaborator={editingCollaborator}
      />
    </>
  );
}
