'use client';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/status-badge';
import { ScoreBadge } from '@/components/score-badge';
import { useCollection, useFirestore, useFirebase } from '@/firebase';
import type { Lead, Collaborator, LeadStatus, LeadTier } from '@/lib/types';
import { collection, query, Timestamp } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { LeadDetailDialog } from './_components/lead-detail-dialog';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { leadStatuses, leadTiers } from '@/lib/types';
import { Bot, Trash2, UserPlus } from 'lucide-react';
import { BulkAssignDialog } from './_components/bulk-assign-dialog';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { collaborator } = useFirebase();
  const { toast } = useToast();
  const isAdmin = collaborator?.role === 'admin';

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  
  // States for filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [collaboratorFilter, setCollaboratorFilter] = useState<string>('All');

  // State for bulk actions
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);


  // --- Data Fetching ---
  const allLeadsQuery = useMemo(() => firestore ? query(collection(firestore, 'leads')) : null, [firestore]);
  const { data: allLeads, isLoading: allLeadsLoading, error: leadsError } = useCollection<Lead>(allLeadsQuery);

  const allUsersQuery = useMemo(() => firestore ? collection(firestore, 'collaborators') : null, [firestore]);
  const { data: allUsers, isLoading: usersLoading } = useCollection<Collaborator>(allUsersQuery);
  
  const collaboratorsForFilter = useMemo(() => {
    return allUsers?.filter(user => user.role === 'collaborator') || [];
  }, [allUsers]);

  const getCreationDate = (l: Lead): Date | null => {
    if (!l) return null;
    if (l.createdAt instanceof Timestamp) return l.createdAt.toDate();
    
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
    
  const getCampaignName = (l: Lead): string | null => {
      let campaign = l.zapName || l.campaignName || (l as any).nom_campagne || (l as any)['Form Name'];
      if (!campaign && l.leadData) {
          try {
              const parsedData = JSON.parse(l.leadData);
              campaign = parsedData.zapName || parsedData.nom_campagne || parsedData['Form Name'];
          } catch(e) { /* ignore */ }
      }
      return campaign || null;
  }
  
  const displayedLeads = useMemo(() => {
    if (!allLeads || !collaborator) return [];

    let filteredLeads: Lead[] = [];

    // --- ADMIN LOGIC ---
    if (isAdmin) {
        filteredLeads = allLeads;
        if (statusFilter !== 'All') {
            filteredLeads = filteredLeads.filter(lead => lead.status === statusFilter);
        }
        if (tierFilter !== 'All') {
            filteredLeads = filteredLeads.filter(lead => lead.tier === tierFilter);
        }
        if (collaboratorFilter !== 'All') {
            filteredLeads = filteredLeads.filter(lead => lead.assignedCollaboratorId === collaboratorFilter);
        }
    } 
    // --- COLLABORATOR LOGIC ---
    else {
        let leadsToProcess = allLeads;
        if (statusFilter !== 'All') {
            leadsToProcess = leadsToProcess.filter(lead => lead.status === statusFilter);
        }
        if (tierFilter !== 'All') {
            leadsToProcess = leadsToProcess.filter(lead => lead.tier === tierFilter);
        }

        if (statusFilter === 'New') {
            // Collaborators see all 'New' leads, regardless of assignment
            filteredLeads = leadsToProcess.filter(lead => lead.status === 'New');
        } else {
            // For all other statuses, collaborator only sees their own leads
            filteredLeads = leadsToProcess.filter(lead => lead.assignedCollaboratorId === collaborator.id);
        }
    }
    
    // Finally, sort the resulting list by date.
    return filteredLeads.sort((a, b) => {
        const dateA = getCreationDate(a)?.getTime() || 0;
        const dateB = getCreationDate(b)?.getTime() || 0;
        return dateB - dateA; // Most recent first
    });

  }, [allLeads, collaborator, isAdmin, statusFilter, tierFilter, collaboratorFilter]);
  
  const getCollaboratorById = (id: string): Collaborator | undefined => {
    return allUsers?.find(u => u.id === id);
  }

  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  }

  const handleOpenLead = (leadId: string) => {
    setSelectedLeadId(leadId);
  };

  const handleCloseLead = () => {
    setSelectedLeadId(null);
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    setSelectedLeads(checked ? displayedLeads.map(l => l.id) : []);
  };
  
  const handleSelectRow = (leadId: string, checked: boolean) => {
    setSelectedLeads(prev => 
      checked ? [...prev, leadId] : prev.filter(id => id !== leadId)
    );
  };

  const isLoading = allLeadsLoading || usersLoading;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-3xl">
          Tableau de Bord
        </h1>
        {isAdmin && selectedLeads.length > 0 && (
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedLeads.length} sélectionné(s)</span>
                 <Button variant="outline" size="sm" onClick={() => setIsAssignDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assigner
                 </Button>
                 <Button variant="outline" size="sm" onClick={() => {}}>
                    <Bot className="mr-2 h-4 w-4" />
                    Qualifier par IA
                 </Button>
                 <Button variant="destructive" size="sm" onClick={() => {}}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                 </Button>
            </div>
        )}
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <CardTitle className="text-lg md:text-2xl">
                  {isAdmin ? 'Tous les Leads' : 'Mes Leads'}
                </CardTitle>
                <CardDescription className="text-sm">
                  Consultez et gérez les prospects. Utilisez les filtres pour affiner votre recherche.
                </CardDescription>
              </div>
              <div className="grid grid-cols-2 md:flex md:flex-row gap-4 w-full md:w-auto">
                 {/* Status Filter */}
                <div className="space-y-1">
                    <Label htmlFor="status-filter" className="text-xs">Statut</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger id="status-filter" className="w-full">
                        <SelectValue placeholder="Filtrer par statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">Tous les statuts</SelectItem>
                        {leadStatuses.map(status => (
                          <SelectItem key={status} value={status}>
                              {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                 {/* Tier Filter (Admin only) */}
                {isAdmin && (
                  <div className="space-y-1">
                    <Label htmlFor="tier-filter" className="text-xs">Tier</Label>
                    <Select value={tierFilter} onValueChange={setTierFilter}>
                      <SelectTrigger id="tier-filter" className="w-full">
                        <SelectValue placeholder="Filtrer par tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">Tous les tiers</SelectItem>
                        {leadTiers.map(tier => (
                          <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                 {/* Collaborator Filter (Admin only) */}
                {isAdmin && (
                  <div className="space-y-1">
                    <Label htmlFor="user-filter" className="text-xs">Collaborateur</Label>
                    <Select value={collaboratorFilter} onValueChange={setCollaboratorFilter}>
                      <SelectTrigger id="user-filter" className="w-full">
                        <SelectValue placeholder="Filtrer par utilisateur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">Tous les collaborateurs</SelectItem>
                        {collaboratorsForFilter.map(user => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center p-8">Chargement des leads...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead className="w-[40px]">
                        <Checkbox 
                            checked={selectedLeads.length > 0 && selectedLeads.length === displayedLeads.length}
                            onCheckedChange={handleSelectAll}
                        />
                    </TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                    {isAdmin && <TableHead className="hidden lg:table-cell">Campagne</TableHead>}
                    {isAdmin && <TableHead className="hidden md:table-cell">Score</TableHead>}
                    <TableHead>Statut</TableHead>
                    <TableHead className="hidden lg:table-cell">Assigné à</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedLeads && displayedLeads.length > 0 ? (
                    displayedLeads.map((lead) => {
                      const assignedCollaborator = lead.assignedCollaboratorId ? getCollaboratorById(lead.assignedCollaboratorId) : null;
                      const leadName = lead.name || (lead as any).nom || 'Nom Inconnu';
                      const leadPhone = lead.phone || (lead as any).telephone || '-';
                      const leadCampaign = getCampaignName(lead) || '-';
                      const leadStatus = lead.status || 'New';
                      
                      const creationDate = getCreationDate(lead);
                      const isSelected = selectedLeads.includes(lead.id);
                      
                      return (
                      <TableRow
                        key={lead.id}
                        data-state={isSelected ? "selected" : undefined}
                      >
                        <TableCell>
                            <Checkbox 
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectRow(lead.id, !!checked)}
                                onClick={(e) => e.stopPropagation()} // Prevent row click when clicking checkbox
                            />
                        </TableCell>
                        <TableCell className="font-medium cursor-pointer" onClick={() => handleOpenLead(lead.id)}>{leadName}</TableCell>
                        <TableCell className="hidden md:table-cell cursor-pointer" onClick={() => handleOpenLead(lead.id)}>{leadPhone}</TableCell>
                         {isAdmin && (
                          <TableCell className="hidden lg:table-cell cursor-pointer" onClick={() => handleOpenLead(lead.id)}>
                           {leadCampaign}
                          </TableCell>
                        )}
                        {isAdmin && (
                          <TableCell className="hidden md:table-cell cursor-pointer" onClick={() => handleOpenLead(lead.id)}>
                            <ScoreBadge score={lead.score} />
                          </TableCell>
                        )}
                        <TableCell className="cursor-pointer" onClick={() => handleOpenLead(lead.id)}>
                          <StatusBadge status={leadStatus} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell cursor-pointer" onClick={() => handleOpenLead(lead.id)}>
                          {assignedCollaborator ? (
                             <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarFallback style={{ backgroundColor: assignedCollaborator.avatarColor }} className="text-white text-xs font-bold">
                                        {getInitials(assignedCollaborator.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{assignedCollaborator.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell cursor-pointer" onClick={() => handleOpenLead(lead.id)}>
                            {creationDate ? (
                                <span className="text-sm text-muted-foreground">
                                    {format(creationDate, "dd/MM/yy HH:mm")}
                                </span>
                            ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenLead(lead.id)}>
                            Détails
                          </Button>
                        </TableCell>
                      </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 9 : 6} className="text-center h-24">
                        { leadsError ? "Une erreur est survenue." : "Aucun lead ne correspond à vos filtres." }
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLeadId && (
        <LeadDetailDialog
          leadId={selectedLeadId}
          isOpen={!!selectedLeadId}
          onClose={handleCloseLead}
        />
      )}
      
       {isAdmin && (
        <BulkAssignDialog
          isOpen={isAssignDialogOpen}
          onClose={() => setIsAssignDialogOpen(false)}
          onAssign={(collaboratorId) => {}}
          collaborators={collaboratorsForFilter}
          isProcessing={isProcessing}
        />
      )}
    </>
  );
}
