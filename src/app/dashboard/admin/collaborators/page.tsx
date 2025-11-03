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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  deleteDocumentNonBlocking,
} from '@/firebase';
import {
  collection,
  doc,
  setDoc,
} from 'firebase/firestore';
import type { Collaborator } from '@/lib/types';
import { useState } from 'react';
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
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function AdminCollaboratorsPage() {
  const firestore = useFirestore();
  const auth = getAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);

  const collaboratorsQuery = useMemoFirebase(
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
    if (editingCollaborator) {
      // NOTE: Update logic is not implemented as password change is complex.
      // We are only focusing on creation for now.
      toast({ title: 'Fonctionnalité non implémentée' });
    } else {
      try {
        // Can't create user in Auth and Firestore in one transaction,
        // so we create the auth user first.
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          data.email,
          data.password
        );
        const firebaseUser = userCredential.user;

        const defaultAvatar = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];
        const newCollaborator: Collaborator = {
          id: firebaseUser.uid,
          name: data.name,
          email: data.email,
          role: data.role,
          avatarUrl: defaultAvatar.imageUrl,
        };

        await setDoc(doc(firestore, 'collaborators', firebaseUser.uid), newCollaborator);

        toast({
          title: 'Collaborateur créé',
          description: `${data.name} a été ajouté.`,
        });
        handleCloseDialog();
      } catch (error: any) {
        console.error('Error creating collaborator:', error);
        let errorMessage = "Impossible de créer le collaborateur.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "Cette adresse email est déjà utilisée.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "Le mot de passe doit contenir au moins 6 caractères.";
        }
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: errorMessage,
        });
      }
    }
  };

  const handleDeleteCollaborator = (collaboratorId: string) => {
    // Note: This only deletes the Firestore record, not the Auth user.
    // Proper user deletion is a more complex operation.
    const collaboratorRef = doc(firestore, 'collaborators', collaboratorId);
    deleteDocumentNonBlocking(collaboratorRef);
    toast({
      variant: 'destructive',
      title: 'Collaborateur supprimé',
      description: 'Le collaborateur a été supprimé (enregistrement Firestore uniquement).',
    });
  };

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
                    <AvatarImage src={c.avatarUrl} />
                    <AvatarFallback>{c.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-sm font-medium capitalize bg-muted px-2 py-1 rounded-md">{c.role}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Supprimer</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action supprimera l'enregistrement du collaborateur de la base de données, mais pas son compte d'authentification.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCollaborator(c.id)}>
                          Supprimer
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
