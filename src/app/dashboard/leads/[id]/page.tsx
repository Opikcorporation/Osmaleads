import { getLeadById, getUserById } from '@/lib/data';
import { notFound } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { leadStatuses, type LeadStatus } from '@/lib/types';
import { Bot, CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await getLeadById(params.id);

  if (!lead) {
    notFound();
  }

  const assignedUser = lead.assignedToId ? await getUserById(lead.assignedToId) : null;
  const currentUser = await getUserById('user-1'); // Mock current user

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-2xl">{lead.name}</CardTitle>
                    <CardDescription>{lead.company} - {lead.email}</CardDescription>
                </div>
                 {assignedUser && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Assigned to</span>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={assignedUser.avatarUrl} alt={assignedUser.name} />
                      <AvatarFallback>{assignedUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                     <span className="font-medium">{assignedUser.name}</span>
                  </div>
                )}
            </div>
          </CardHeader>
           <CardContent>
             <div className="flex items-center gap-4">
               <span className="text-sm font-medium">Status:</span>
               <Select defaultValue={lead.status}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Set status" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        <StatusBadge status={status as LeadStatus} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
           </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="text-accent" /> AI-Generated Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{lead.profile}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Notes & History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-2">
              <Textarea placeholder="Add a new note..." />
              <Button className="w-full">Add Note</Button>
            </form>
            <Separator />
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {lead.notes.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-4">No notes yet.</p>
              ) : (
                lead.notes.map((note) => (
                  <div key={note.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={note.author.avatarUrl} alt={note.author.name} />
                      <AvatarFallback>{note.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm">{note.author.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(parseISO(note.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">{note.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
