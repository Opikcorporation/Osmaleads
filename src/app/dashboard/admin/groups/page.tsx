import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusCircle, Users } from "lucide-react";
import { getGroups, getUsers } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function AdminGroupsPage() {
  const groups = await getGroups();
  const users = await getUsers();
  const collaborators = users.filter(u => u.role === 'collaborator');

  const getGroupMembers = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
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
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="text-primary" />
                  {group.name}
                </CardTitle>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
              <CardDescription>{getGroupMembers(group.id).length} members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex -space-x-2 overflow-hidden">
                {getGroupMembers(group.id).map(member => (
                   <Avatar key={member.id} className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-gray-800">
                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {getGroupMembers(group.id).map(member => (
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
        ))}
      </div>
    </>
  );
}
