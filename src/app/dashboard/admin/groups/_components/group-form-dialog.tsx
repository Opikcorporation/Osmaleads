'use client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type Group,
  type Collaborator,
  type DistributionSetting,
  type LeadTier,
  leadTiers,
} from '@/lib/types';
import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';

interface GroupFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    groupData: { name: string; collaboratorIds: string[] };
    settingData: { dailyQuota: number; leadTier: LeadTier | 'Tous' };
  }) => void;
  group: Group | null;
  setting: DistributionSetting | null;
  allCollaborators: Collaborator[];
}

export function GroupFormDialog({
  isOpen,
  onClose,
  onSave,
  group,
  setting,
  allCollaborators,
}: GroupFormDialogProps) {
  const [name, setName] = useState('');
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [dailyQuota, setDailyQuota] = useState(5);
  const [leadTier, setLeadTier] = useState<LeadTier | 'Tous'>('Tous');

  useEffect(() => {
    if (isOpen) {
      if (group) {
        setName(group.name);
        setSelectedCollaborators(group.collaboratorIds || []);
      } else {
        setName('');
        setSelectedCollaborators([]);
      }
      if (setting) {
        setDailyQuota(setting.dailyQuota);
        setLeadTier(setting.leadTier);
      } else {
        setDailyQuota(5);
        setLeadTier('Tous');
      }
    }
  }, [group, setting, isOpen]);
  
  const handleCollaboratorCheckboxChange = (collaboratorId: string) => {
    setSelectedCollaborators(prev => 
      prev.includes(collaboratorId) 
        ? prev.filter(id => id !== collaboratorId)
        : [...prev, collaboratorId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSave({ 
        groupData: { name, collaboratorIds: selectedCollaborators },
        settingData: { dailyQuota, leadTier }
    });
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{group ? 'Modifier le Groupe' : 'Créer un Groupe'}</DialogTitle>
            <DialogDescription>
              {group
                ? "Modifiez le nom, les membres et les règles de distribution de ce groupe."
                : "Créez un nouveau groupe et configurez ses règles d'assignement de leads."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
             {/* Group Settings */}
            <div>
              <Label htmlFor="name" className='text-base font-semibold'>Nom du Groupe</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2"
                required
                placeholder="Ex: Équipe Alpha"
              />
            </div>

            <div className="space-y-2">
                <Label className='text-base font-semibold'>Membres</Label>
                <ScrollArea className="h-32 rounded-md border p-4">
                    <div className="space-y-2">
                        {allCollaborators.length > 0 ? allCollaborators.map(c => (
                            <div key={c.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`collaborator-${c.id}`}
                                    checked={selectedCollaborators.includes(c.id)}
                                    onCheckedChange={() => handleCollaboratorCheckboxChange(c.id)}
                                />
                                <Label htmlFor={`collaborator-${c.id}`} className="font-normal">
                                    {c.name}
                                </Label>
                            </div>
                        )) : <p className="text-sm text-muted-foreground text-center">Aucun collaborateur disponible.</p>}
                    </div>
                </ScrollArea>
             </div>
            
            <Separator />

             {/* Distribution Settings */}
             <div className="space-y-4">
                <h3 className="text-base font-semibold">Règles de Distribution</h3>
                <div className="space-y-2">
                  <Label htmlFor="lead-tier">Tier de Lead Ciblé</Label>
                  <Select onValueChange={(value) => setLeadTier(value as any)} value={leadTier}>
                    <SelectTrigger id="lead-tier">
                      <SelectValue placeholder="Sélectionner un tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tous">Tous les Tiers</SelectItem>
                      {leadTiers.map(tier => (
                        <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="quota">Quota de leads par jour</Label>
                  <Input id="quota" type="number" value={dailyQuota} onChange={(e) => setDailyQuota(Number(e.target.value))} placeholder="e.g., 5" />
                </div>
             </div>

          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
