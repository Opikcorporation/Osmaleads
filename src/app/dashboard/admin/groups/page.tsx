'use client'
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusCircle, Users, Trash2, Edit, Bot } from "lucide-react";
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
import type { Group, Collaborator, DistributionSetting } from '@/lib/types';
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
import { distributeLeadsForGroup } from '@/ai/flows/distribute-leads-flow';

export default function AdminGroupsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [distributingGroupId, setDistributingGroupId] = useState<string | null>(null);

  const groupsQuery = useMemoFirebase(
    () => collection(firestore, 'groups'),
    [firestore]
  );
  const usersQuery = useMemoFirebase(
    () => collection(firestore, 'collaborators'),
    [firestore]
  );
  const settingsQuery = useMemoFirebase(
    () => collection(firestore, 'distributionSettings'),
    [firestore]
  );

  const { data: groups, isLoading: groupsLoading } =
    useCollection<Group>(groupsQuery);
  const { data: users, isLoading: usersLoading } =
    useCollection<Collaborator>(usersQuery);
  const { data: settings, isLoading: settingsLoading } = 
    useCollection<DistributionSetting>(settingsQuery);

  const isLoading = groupsLoading || usersLoading || settingsLoading;

  if (isLoading) {
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
  
  const handleDistribute = async (group: Group) => {
    setDistributingGroupId(group.id);
    toast({ title: `Distribution pour ${group.name}`, description: "L'IA recherche des leads correspondants..." });
    
    try {
        const result = await distributeLeadsForGroup({ groupId: group.id });
        if(result.distributedCount > 0) {
            toast({ title: "Distribution réussie", description: `${result.distributedCount} lead(s) ont été distribués au groupe ${group.name}.` });
        } else {
            toast({ title: "Distribution terminée", description: `Aucun nouveau lead à distribuer pour le groupe ${group.name} pour le moment.` });
        }
    } catch (error: any) {
        console.error("Distribution error for group:", error);
        toast({ variant: 'destructive', title: "Erreur de distribution", description: error.message || "Une erreur inconnue est survenue." });
    } finally {
        setDistributingGroupId(null);
    }
  }
  
  const getGroupSetting = (groupId: string) => {
    return settings?.find(s => s.groupId === groupId);
  }


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
          const groupSetting = getGroupSetting(group.id);
          const isDistributing = distributingGroupId === group.id;

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
                 <div>
                    <h4 className="mb-2 text-sm font-semibold">Règle de Distribution</h4>
                    {groupSetting ? (
                        <p className="text-sm text-muted-foreground">Cible : <span className="font-bold text-primary">{groupSetting.leadTier}</span> (Max {groupSetting.dailyQuota}/jour)</p>
                    ) : (
                        <p className="text-sm text-muted-foreground">Aucune règle définie.</p>
                    )}
                 </div>
              </CardContent>
               <div className="p-4 pt-0">
                 <Button onClick={() => handleDistribute(group)} disabled={!groupSetting || isDistributing} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Bot className="mr-2 h-4 w-4" />
                    {isDistributing ? 'Distribution...' : `Distribuer à ${group.name}`}
                </Button>
               </div>
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

    