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
import { fr } from 'date-fns/locale';

interface LeadDetailDialogProps {
  leadId: string;
  isOpen: boolean;
  onClose: () => void;
}

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
);

const isPhoneNumber = (value: string | null | undefined): boolean => {
    if (!value || typeof value !== 'string') return false;
    // Regex simple pour détecter un numéro de téléphone international
    const phoneRegex = /^\+?[0-9\s\-\(\)]{6,}$/;
    return phoneRegex.test(value);
};

const formatPhoneNumberForLink = (value: string): string => {
    // Supprime tous les caractères non numériques
    return value.replace(/\D/g, '');
};

const capitalizeFirstLetter = (string: string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
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
    if (!lead || !lead.leadData) {
        return <p className="text-sm text-muted-foreground">Aucune information supplémentaire disponible.</p>;
    }
    
    let parsedData: any = {};
    try {
        parsedData = JSON.parse(lead.leadData);
    } catch {
        return <p className="text-sm text-destructive">Erreur: impossible d'analyser les données du prospect.</p>;
    }
    
    // Define a minimal set of keys to exclude (already shown in header or managed internally)
    const excludeKeys = ['nom', 'FULL NAME', 'email', 'EMAIL', 'telephone', 'PHONE'];

    const dataToDisplay = Object.entries(parsedData)
        .filter(([key, value]) => !excludeKeys.includes(key) && value) // Exclude specified keys and empty values
        .map(([key, value]) => {
            let displayValue: string = String(value);

            // Clean up the key for display
            const displayKey = key
                .replace(/_/g, ' ')
                .replace(/Raw/g, '')
                .trim();
            
            return {
                label: capitalizeFirstLetter(displayKey),
                value: displayValue,
            };
        });

    if (dataToDisplay.length === 0) {
        return <p className="text-sm text-muted-foreground">Aucune information supplémentaire à afficher.</p>;
    }

    return (
        <ul className="space-y-3 text-sm text-foreground">
            {dataToDisplay.map(({ label, value }) => (
                <li key={label}>
                    <strong className="capitalize">{label}:</strong> {value}
                </li>
            ))}
        </ul>
    );
};
  
  const getCreationDate = (l: Lead | null | undefined): Date | null => {
    if (!l) return null;
    if (l.createdAt instanceof Timestamp) {
      return l.createdAt.toDate();
    }
    
    let dateString: string | undefined | null = (l as any).created_time || (l as any)['Created Time'];
    
    if (!dateString && l.leadData) {
        try {
            const parsedData = JSON.parse(l.leadData);
            dateString = parsedData.created_time || parsedData['Created Time'];
        } catch (e) { /* ignore */ }
    }
    
    if (dateString) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) return date;
    }
    
    return null;
  };

  const { leadName, leadEmail, leadPhone } = useMemo(() => {
    if (!lead) return { leadName: 'Chargement...', leadEmail: null, leadPhone: null };

    let parsedData = {};
    if (lead.leadData) {
        try {
            parsedData = JSON.parse(lead.leadData);
        } catch {}
    }

    const name = lead.name || (parsedData as any).nom || (parsedData as any)['FULL NAME'] || 'Prospect Inconnu';
    const email = lead.email || (parsedData as any).email || (parsedData as any)['EMAIL'] || null;
    const phone = lead.phone || (parsedData as any).telephone || (parsedData as any)['PHONE'] || null;

    return { leadName: name, leadEmail: email, leadPhone: phone };
  }, [lead]);


  const isLoading = leadLoading || allUsersLoading;
  const leadStatus = lead?.status || 'New';
  const creationDate = getCreationDate(lead);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 w-[calc(100%-2rem)] mx-auto rounded-lg">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="sr-only">Fiche de {leadName}</DialogTitle>
          <DialogDescription className="sr-only">Détails complets et historique des interactions pour ce lead.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center p-8">Chargement de la fiche lead...</div>
        ) : !lead ? (
          <div className="text-center p-8 text-destructive">Lead introuvable.</div>
        ) : (
          <div className="overflow-y-auto">
            <div className="p-6 pt-0 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                      <div>
                          <CardTitle className="text-2xl">{leadName}</CardTitle>
                          <div className="text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:gap-4 mt-1">
                            {leadEmail && <span>{leadEmail}</span>}
                            {leadPhone && isPhoneNumber(leadPhone) ? (
                                 <a href={`https://wa.me/${formatPhoneNumberForLink(leadPhone)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline text-primary font-medium">
                                    <WhatsAppIcon />
                                    <span>{leadPhone}</span>
                                </a>
                            ) : leadPhone ? (
                                <span>{leadPhone}</span>
                            ) : null}
                          </div>
                           {creationDate && (
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-2">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                <span>Créé le {format(creationDate, "d MMMM yyyy 'à' HH:mm", { locale: fr })}</span>
                            </div>
                          )}
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
                            <span className="text-sm font-medium">Statut:</span>
                            <Select defaultValue={leadStatus} onValueChange={handleStatusChange}>
                                <SelectTrigger className="w-auto border-none shadow-none text-sm font-medium -ml-2 bg-transparent focus:ring-0 focus:ring-offset-0">
                                  <SelectValue>
                                    <StatusBadge status={leadStatus as LeadStatus} />
                                  </SelectValue>
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
                        {authUser?.role === 'admin' && lead.tier && (
                            <div className="flex items-center gap-2">
                               <Gem className="h-4 w-4 text-primary" />
                               <Badge variant="secondary">{lead.tier}</Badge>
                           </div>
                        )}
                        {authUser?.role === 'admin' && lead.score !== null && typeof lead.score !== 'undefined' && (
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
                  <CardTitle className="flex items-center gap-2"><Info className="text-primary" /> Informations Complètes</CardTitle>
                  <CardDescription>Données originales provenant de l'importation.</CardDescription>
                </CardHeader>
                <CardContent>
                  {renderLeadData()}
                </CardContent>
              </Card>

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
                  <div className="space-y-6 flex-1">
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
