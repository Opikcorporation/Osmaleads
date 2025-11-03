'use client';
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
import { leadStatuses, type LeadStatus, type Lead, type Collaborator, FirestoreNote } from '@/lib/types';
import { Bot, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { useState } from 'react';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const { toast } = useToast();

  const leadRef = useMemoFirebase(() => doc(firestore, 'leads', params.id), [firestore, params.id]);
  const { data: lead, isLoading: leadLoading } = useDoc<Lead>(leadRef);

  const assignedUserRef = useMemoFirebase(() => lead?.assignedCollaboratorId ? doc(firestore, 'collaborators', lead.assignedCollaboratorId) : null, [firestore, lead]);
  const { data: assignedUser, isLoading: assignedUserLoading } = useDoc<Collaborator>(assignedUserRef);

  const notesRef = useMemoFirebase(() => query(collection(firestore, 'leads', params.id, 'notes'), orderBy('timestamp', 'desc')), [firestore, params.id]);
  const { data: notes, isLoading: notesLoading } = useCollection<FirestoreNote>(notesRef);
  
  const allUsersRef = useMemoFirebase(() => collection(firestore, 'collaborators'), [firestore]);
  const { data: allUsers, isLoading: allUsersLoading } = useCollection<Collaborator>(allUsersRef);

  const [newNote, setNewNote] = useState('');
  
  const handleStatusChange = (status: LeadStatus) => {
    if (lead) {
      updateDocumentNonBlocking(leadRef, { status });
      toast({
        title: "Statut mis à jour",
        description: `Le statut du lead est maintenant ${status}.`,
      });
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !authUser || !lead) return;

    const noteToAdd = {
      leadId: lead.id,
      collaboratorId: authUser.uid,
      content: newNote,
      timestamp: Timestamp.now(),
    };

    const notesColRef = collection(firestore, 'leads', lead.id, 'notes');
    addDocumentNonBlocking(notesColRef, noteToAdd);

    setNewNote('');
    toast({
      title: "Note ajoutée",
      description: "Votre note a été enregistrée.",
    });
  };
  
  const getNoteAuthor = (collaboratorId: string) => {
    return allUsers?.find(u => u.id === collaboratorId);
  }

  if (leadLoading || assignedUserLoading || notesLoading || allUsersLoading) {
    return <div>Chargement du lead...</div>;
  }

  if (!lead) {
    notFound();
  }

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
                    <span>Assigné à</span>
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
               <Select defaultValue={lead.status} onValueChange={handleStatusChange}>
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
            <CardTitle className="flex items-center gap-2"><Bot className="text-accent" /> Profil Généré par IA</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{lead.aiProfile}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Notes & Historique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddNote} className="space-y-2">
              <Textarea placeholder="Ajouter une note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
              <Button className="w-full" type="submit" disabled={!newNote.trim()}>Ajouter une note</Button>
            </form>
            <Separator />
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {notes?.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-4">Aucune note pour le moment.</p>
              ) : (
                notes?.map((note) => {
                  const author = getNoteAuthor(note.collaboratorId);
                  return (
                  <div key={note.id} className="flex gap-3">
                     {author ? (
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={author.avatarUrl} alt={author.name} />
                            <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                     ) : (
                        <Avatar className="h-8 w-8 bg-muted" />
                     )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm">{author?.name || "Utilisateur inconnu"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {note.timestamp && format(note.timestamp.toDate(), 'MMM d, yyyy, h:mm a')}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">{note.content}</p>
                    </div>
                  </div>
                )})
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
