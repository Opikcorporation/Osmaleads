'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { leadStatuses, type LeadStatus, type Lead, type Collaborator, type FirestoreNote } from '@/lib/types';
import { CalendarIcon, Info, TrendingUp, Gem } from 'lucide-react';
import { format } from 'date-fns';
import { useDoc, useCollection, useFirestore, useFirebase } from '@/firebase';
import { doc, collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';

interface LeadDetailDialogProps {
  leadId: string;
  isOpen: boolean;
  onClose: () => void;
}

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
        <path d="M14.05 2.9A10 10 0 0 1 22 11.45" opacity="0.3"></path>
        <path d="M14.05 6.4A6 6 0 0 1 19.6 11.95" opacity="0.3"></path>
    </svg>
);

const isPhoneNumber = (value: string): boolean => {
    if (typeof value !== 'string') return false;
    // Regex to check for a string that is mostly numbers, possibly with a leading +, and some common phone characters.
    // This is more strict to avoid matching on IDs or other numerical data.
    const phoneRegex = /^\+?[0-9\s\-\(\)]{6,}$/;
    return phoneRegex.test(value);
};

const formatPhoneNumberForLink = (value: string): string => {
    return value.replace(/\D/g, '');
};

export function LeadDetailDialog({ leadId, isOpen, onClose }: LeadDetailDialogProps) {
  const firestore = useFirestore();
  const { collaborator: authUser } = useFirebase();
  const { toast } = useToast();

  const leadRef = useMemo(() => doc(firestore, 'leads', leadId), [firestore, leadId]);
  const { data: lead, isLoading: leadLoading } = useDoc<Lead>(leadRef);

  const assignedUserRef = useMemo(() => lead?.assignedCollaboratorId ? doc(firestore, 'collaborators', lead.assignedCollaboratorId) : null, [firestore, lead]);
  const { data: assignedUser } = useDoc<Collaborator>(assignedUserRef);

  const notesRef = useMemo(() => query(collection(firestore, 'leads', leadId, 'notes'), orderBy('timestamp', 'desc')), [firestore, leadId]);
  const { data: notes, isLoading: notesLoading } = useCollection<FirestoreNote>(notesRef);
  
  const allUsersRef = useMemo(() => collection(firestore, 'collaborators'), [firestore]);
  const { data: allUsers, isLoading: allUsersLoading } = useCollection<Collaborator>(allUsersRef);

  const [newNote, setNewNote] = useState('');

  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  }
  
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
      collaboratorId: authUser.id,
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

  const renderLeadData = () => {
    if (!lead?.leadData) return null;
    try {
        const data = JSON.parse(lead.leadData);
        // Display values only, without technical keys.
        return (
            <ul className="space-y-2 text-foreground">
                {Object.values(data).map((value, index) => {
                    const stringValue = String(value);
                    if (isPhoneNumber(stringValue)) {
                        return (
                             <li key={index}>
                                <a href={`https://wa.me/${formatPhoneNumberForLink(stringValue)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline text-primary font-medium">
                                    <WhatsAppIcon />
                                    <span>{stringValue}</span>
                                </a>
                            </li>
                        )
                    }
                     return (
                         <li key={index} className="text-foreground">
                            {stringValue}
                        </li>
                     );
                })}
            </ul>
        )
    } catch(e) {
        // Fallback for non-JSON data
        return <p className="text-sm text-foreground whitespace-pre-wrap">{lead.leadData}</p>
    }
  }

  // The main loading state only depends on the essential data needed to render the shell.
  const isLoading = leadLoading || allUsersLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] grid grid-cols-1 md:grid-cols-3 gap-6">
        <DialogHeader className="md:col-span-3">
          <DialogTitle className="sr-only">Fiche de {lead?.name || 'Lead'}</DialogTitle>
          <DialogDescription className="sr-only">Détails complets et historique des interactions pour ce lead.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="md:col-span-3 text-center p-8">Chargement de la fiche lead...</div>
        ) : !lead ? (
          <div className="md:col-span-3 text-center p-8 text-destructive">Lead introuvable.</div>
        ) : (
          <>
            <div className="md:col-span-2 space-y-6 overflow-y-auto pr-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                      <div>
                          <CardTitle className="text-2xl">{lead.name}</CardTitle>
                          <CardDescription>{lead.company} - {lead.email}</CardDescription>
                      </div>
                      {assignedUser && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
                          <span>Assigné à</span>
                          <Avatar className="h-8 w-8">
                             <AvatarFallback style={{ backgroundColor: assignedUser.avatarColor }} className="text-white font-bold">
                                {getInitials(assignedUser.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{assignedUser.name}</span>
                        </div>
                      )}
                  </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
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
                        {lead.tier && (
                            <div className="flex items-center gap-2">
                               <Gem className="h-4 w-4 text-primary" />
                               <Badge variant="secondary">{lead.tier}</Badge>
                           </div>
                        )}
                        {lead.score !== null && typeof lead.score !== 'undefined' && (
                             <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                <Badge variant="outline">Score: {lead.score}</Badge>
                            </div>
                        )}
                    </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Info className="text-accent" /> Informations Complètes</CardTitle>
                  <CardDescription>Données originales provenant de l'importation.</CardDescription>
                </CardHeader>
                <CardContent>
                  {renderLeadData()}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 overflow-y-auto flex flex-col">
              <Card className="flex-grow flex flex-col">
                <CardHeader>
                  <CardTitle>Notes & Historique</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow flex flex-col">
                  <form onSubmit={handleAddNote} className="space-y-2">
                    <Textarea placeholder="Ajouter une note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                    <Button className="w-full" type="submit" disabled={!newNote.trim()}>Ajouter une note</Button>
                  </form>
                  <Separator />
                  <div className="space-y-6 flex-1 overflow-y-auto pr-2">
                    {notesLoading ? <p className="text-sm text-center text-muted-foreground py-4">Chargement des notes...</p> : notes?.length === 0 ? (
                      <p className="text-sm text-center text-muted-foreground py-4">Aucune note pour le moment.</p>
                    ) : (
                      notes?.map((note) => {
                        const author = getNoteAuthor(note.collaboratorId);
                        return (
                        <div key={note.id} className="flex gap-3">
                          {author ? (
                              <Avatar className="h-8 w-8">
                                  <AvatarFallback style={{ backgroundColor: author.avatarColor }} className="text-white font-bold">
                                    {getInitials(author.name)}
                                </AvatarFallback>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
