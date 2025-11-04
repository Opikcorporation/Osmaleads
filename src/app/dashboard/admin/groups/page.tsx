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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
} from "@/firebase";
import { collection, doc, writeBatch } from 'firebase/firestore';
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

    const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  }

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
  
  const getGroupSetting = (groupId: string) => {
    return settings?.find(s => s.groupId === groupId);
  }

  const handleOpenDialog = (group: Group | null = null) => {
    setEditingGroup(group);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingGroup(null);
  };

  const handleSaveGroup = async (data: any) => {
    // This logic will be implemented in the next step
    toast({ title: 'Fonctionnalité en cours de développement', description: 'La sauvegarde sera bientôt disponible.'});
    handleCloseDialog();
  };

  const handleDeleteGroup = async (groupId: string) => {
     // This logic will be implemented in the next step
    toast({ variant: 'destructive', title: 'Fonctionnalité en cours de développement', description: 'La suppression sera bientôt disponible.'});
  };
  
  const handleDistribute = async (group: Group) => {
    setDistributingGroupId(group.id);
    toast({ title: `Distribution pour ${group.name}`, description: "La logique de distribution n'est pas encore implémentée." });
    setTimeout(() => setDistributingGroupId(null), 2000);
  }
  
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Gérer les Groupes & la Distribution</h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Créer un Groupe
        </Button>
      </div>
      <p className="text-muted-foreground">
        Créez des équipes, assignez des collaborateurs et définissez leurs règles de distribution de leads.
      </p>

      <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                            Cette action est irréversible. Le groupe "{group.name}" et ses règles de distribution seront supprimés.
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
                          <AvatarFallback style={{ backgroundColor: member.avatarColor }} className="text-white font-bold">
                            {getInitials(member.name)}
                          </AvatarFallback>
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
         {groups?.length === 0 && !isLoading && (
            <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="flex flex-col items-center justify-center p-10 text-center">
                    <Users className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Aucun groupe pour le moment</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Commencez par créer un groupe pour organiser vos collaborateurs et définir des règles de distribution de leads.</p>
                    <Button className="mt-4" onClick={() => handleOpenDialog()}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Créer votre premier groupe
                    </Button>
                </CardContent>
            </Card>
        )}
      </div>
       <GroupFormDialog 
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveGroup}
        group={editingGroup}
        setting={editingGroup ? getGroupSetting(editingGroup.id) : null}
        allCollaborators={collaborators}
       />
    </>
  );
}
