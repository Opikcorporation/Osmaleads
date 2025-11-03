import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  Users,
  FileUp,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { getUserById, getLeads, getUsers } from '@/lib/data';
import type { Lead } from '@/lib/types';
import { StatusBadge } from '@/components/status-badge';

// This is a mock auth function. In a real app, you'd get the user from the session.
const getAuthenticatedUser = async () => {
  return await getUserById('user-1'); // Switch to 'user-2' to test collaborator view
};

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) return <div>Not logged in</div>;

  const leads = await getLeads();
  const users = await getUsers();
  const collaborators = users.filter((u) => u.role === 'collaborator');

  const getAssignedUser = (lead: Lead) => {
    if (!lead.assignedToId) return null;
    return users.find((u) => u.id === lead.assignedToId);
  };
  
  const stats = {
    totalLeads: leads.length,
    qualified: leads.filter(l => l.status === 'Qualified').length,
    signed: leads.filter(l => l.status === 'Signed').length,
    newLeads: leads.filter(l => l.status === 'New').length,
  };
  
  // Logic to get collaborator leads
  const collaboratorLeads = user.role === 'collaborator' 
    ? leads.filter(lead => lead.assignedToId === user.id)
    : [];

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Dashboard</h1>
        {user.role === 'admin' && (
            <Button>
                <FileUp className="mr-2 h-4 w-4" /> Import Leads
            </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified Leads</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.qualified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deals Signed</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.signed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newLeads}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{user.role === 'admin' ? 'All Leads' : 'My Leads'}</CardTitle>
          <CardDescription>
            {user.role === 'admin' ? 'A list of all leads in the system.' : 'Leads assigned to you.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Status</TableHead>
                {user.role === 'admin' && <TableHead>Assigned To</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(user.role === 'admin' ? leads : collaboratorLeads).map((lead) => {
                const assignedUser = getAssignedUser(lead);
                return (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-sm text-muted-foreground">{lead.email}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} />
                    </TableCell>
                    {user.role === 'admin' && (
                      <TableCell>
                        {assignedUser ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={assignedUser.avatarUrl} alt={assignedUser.name} />
                              <AvatarFallback>{assignedUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {assignedUser.name}
                          </div>
                        ) : (
                          <Badge variant="secondary">Unassigned</Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/leads/${lead.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
