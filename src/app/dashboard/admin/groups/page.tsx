'use client'
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusCircle, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from 'firebase/firestore';
import type { Group, Collaborator } from '@/lib/types';

export default function AdminGroupsPage() {
  const firestore = useFirestore();
  const groupsQuery = useMemoFirebase(() => collection(firestore, 'groups'), [firestore]);
  const usersQuery = useMemoFirebase(() => collection(firestore, 'collaborators'), [firestore]);

  const { data: groups, isLoading: groupsLoading } = useCollection<Group>(groupsQuery);
  const { data: users, isLoading: usersLoading } = useCollection<Collaborator>(usersQuery);

  if (groupsLoading || usersLoading) {
    return <div>Chargement des groupes...</div>
  }

  const collaborators = users?.filter(u => u.role === 'collaborator') || [];

  const getGroupMembers = (groupId: string) => {
    const group = groups?.find(g => g.id === groupId);
    if (!group) return [];
    return collaborators.filter(c => group.memberIds.includes(c.id));
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Manage Groups</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Group
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups?.map((group) => {
          const members = getGroupMembers(group.id);
          return (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="text-primary" />
                    {group.name}
                  </CardTitle>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
                <CardDescription>{members.length} members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex -space-x-2 overflow-hidden">
                  {members.map(member => (
                     <Avatar key={member.id} className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-gray-800">
                      <AvatarImage src={member.avatarUrl} alt={member.name} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {members.map(member => (
                      <li key={member.id} className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 text-xs">
                             <AvatarImage src={member.avatarUrl} alt={member.name} />
                             <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                      </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  );
}
