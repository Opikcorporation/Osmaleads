
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


export default function DashboardPage() {
  const firestore = useFirestore();
  const { collaborator } = useFirebase();
  const isAdmin = collaborator?.role === 'admin';

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  
  // States for filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [collaboratorFilter, setCollaboratorFilter] = useState<string>('All');

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
      let campaign = l.campaignName || (l as any).nom_campagne || (l as any)['Form Name'];
      if (!campaign && l.leadData) {
          try {
              const parsedData = JSON.parse(l.leadData);
              campaign = parsedData.nom_campagne || parsedData['Form Name'];
          } catch(e) { /* ignore */ }
      }
      return campaign || null;
  }
  
  const displayedLeads = useMemo(() => {
    if (!allLeads || !collaborator) {
      return [];
    }

    let filteredLeads = [...allLeads];

    // --- ADMIN LOGIC ---
    if (isAdmin) {
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
      // First, apply the status and tier filters to the whole list
      if (statusFilter !== 'All') {
        filteredLeads = filteredLeads.filter(lead => lead.status === statusFilter);
      }
      if (tierFilter !== 'All') { // Note: Tier filter is not visible to collaborator, but we keep the logic for consistency
         filteredLeads = filteredLeads.filter(lead => lead.tier === tierFilter);
      }

      // Now, apply collaborator-specific visibility rules
      if (statusFilter === 'New') {
        // If filtering for "New", show all "New" leads, assigned or not.
        // The list is already filtered to only "New" leads from the step above.
        // No further filtering needed.
      } else {
        // For any other status (or 'All'), only show leads assigned to the current collaborator.
        filteredLeads = filteredLeads.filter(lead => lead.assignedCollaboratorId === collaborator.id);
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
  
  const isLoading = allLeadsLoading || usersLoading;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-3xl">
          Tableau de Bord
        </h1>
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
                      
                      return (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer"
                        onClick={() => handleOpenLead(lead.id)}
                      >
                        <TableCell className="font-medium">{leadName}</TableCell>
                        <TableCell className="hidden md:table-cell">{leadPhone}</TableCell>
                         {isAdmin && (
                          <TableCell className="hidden lg:table-cell">
                           {leadCampaign}
                          </TableCell>
                        )}
                        {isAdmin && (
                          <TableCell className="hidden md:table-cell">
                            <ScoreBadge score={lead.score} />
                          </TableCell>
                        )}
                        <TableCell>
                          <StatusBadge status={leadStatus} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
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
                        <TableCell className="hidden lg:table-cell">
                            {creationDate ? (
                                <span className="text-sm text-muted-foreground">
                                    {format(creationDate, "dd/MM/yy HH:mm")}
                                </span>
                            ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Détails
                          </Button>
                        </TableCell>
                      </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 8 : 5} className="text-center h-24">
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
    </>
  );
}
