'use client'
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusCircle, Users, Trash2, Edit } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { collection, doc } from 'firebase/firestore';
import type { Group, Collaborator } from '@/lib/types';
import { useState } from 'react';
import { GroupFormDialog } from './_components/group-form-dialog';
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

export default function AdminGroupsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const groupsQuery = useMemoFirebase(
    () => collection(firestore, 'groups'),
    [firestore]
  );
  const usersQuery = useMemoFirebase(
    () => collection(firestore, 'collaborators'),
    [firestore]
  );

  const { data: groups, isLoading: groupsLoading } =
    useCollection<Group>(groupsQuery);
  const { data: users, isLoading: usersLoading } =
    useCollection<Collaborator>(usersQuery);

  if (groupsLoading || usersLoading) {
    return <div>Chargement des groupes...</div>;
  }

  const collaborators = users?.filter((u) => u.role === 'collaborator') || [];

  const getGroupMembers = (groupId: string) => {
    const group = groups?.find((g) => g.id === groupId);
    if (!group) return [];
    // Ensure group.memberIds exists and is an array
    const memberIds = group.collaboratorIds || [];
    return collaborators.filter((c) => memberIds.includes(c.id));
  };
  
  const handleOpenDialog = (group: Group | null = null) => {
    setEditingGroup(group);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingGroup(null);
  };

  const handleSaveGroup = (groupData: { name: string; collaboratorIds: string[] }) => {
    if (editingGroup) {
      // Update existing group
      const groupRef = doc(firestore, 'groups', editingGroup.id);
      updateDocumentNonBlocking(groupRef, groupData);
       toast({ title: 'Groupe mis à jour', description: `Le groupe "${groupData.name}" a été modifié.` });
    } else {
      // Create new group
      const groupsColRef = collection(firestore, 'groups');
      addDocumentNonBlocking(groupsColRef, groupData);
       toast({ title: 'Groupe créé', description: `Le groupe "${groupData.name}" a été ajouté.` });
    }
    handleCloseDialog();
  };

  const handleDeleteGroup = (groupId: string) => {
    const groupRef = doc(firestore, 'groups', groupId);
    deleteDocumentNonBlocking(groupRef);
    toast({ variant: 'destructive', title: 'Groupe supprimé', description: 'Le groupe a été supprimé avec succès.' });
  };


  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Gérer les Groupes</h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Créer un Groupe
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups?.map((group) => {
          const members = getGroupMembers(group.id);
          return (
            <Card key={group.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="text-primary" />
                    {group.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(group)}>
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
                          <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. Le groupe "{group.name}" sera définitivement supprimé.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteGroup(group.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardDescription>{members.length} membre(s)</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Membres</h4>
                  {members.length > 0 ? (
                  <>
                      <div className="flex -space-x-2 overflow-hidden">
                      {members.slice(0, 5).map(member => (
                          <Avatar key={member.id} className="inline-block h-10 w-10 rounded-full ring-2 ring-card">
                          <AvatarImage src={member.avatarUrl} alt={member.name} />
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                      ))}
                      {members.length > 5 && <Avatar className="inline-block h-10 w-10 rounded-full ring-2 ring-card"><AvatarFallback>+{members.length-5}</AvatarFallback></Avatar>}
                      </div>
                  </>
                  ) : (
                      <p className="text-sm text-muted-foreground">Aucun membre dans ce groupe.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
       <GroupFormDialog 
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveGroup}
        group={editingGroup}
        allCollaborators={collaborators}
       />
    </>
  );
}
