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
import type { Group, Collaborator, LeadTier } from '@/lib/types';
import { useEffect, useState } from 'react';
import { leadTiers } from '@/lib/types';

interface GroupFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (groupData: { name: string; collaboratorIds: string[]; acceptedTiers: LeadTier[] }) => void;
  group: Group | null;
  allCollaborators: Collaborator[];
}

export function GroupFormDialog({
  isOpen,
  onClose,
  onSave,
  group,
  allCollaborators,
}: GroupFormDialogProps) {
  const [name, setName] = useState('');
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [acceptedTiers, setAcceptedTiers] = useState<LeadTier[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (group) {
        setName(group.name);
        setSelectedCollaborators(group.collaboratorIds || []);
        setAcceptedTiers(group.acceptedTiers || []);
      } else {
        setName('');
        setSelectedCollaborators([]);
        setAcceptedTiers([]);
      }
    }
  }, [group, isOpen]);
  
  const handleCollaboratorCheckboxChange = (collaboratorId: string) => {
    setSelectedCollaborators(prev => 
      prev.includes(collaboratorId) 
        ? prev.filter(id => id !== collaboratorId)
        : [...prev, collaboratorId]
    );
  };

  const handleTierCheckboxChange = (tier: LeadTier) => {
    setAcceptedTiers(prev =>
      prev.includes(tier)
        ? prev.filter(t => t !== tier)
        : [...prev, tier]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSave({ name, collaboratorIds: selectedCollaborators, acceptedTiers });
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{group ? 'Modifier le Groupe' : 'Créer un Groupe'}</DialogTitle>
            <DialogDescription>
              {group
                ? "Modifiez le nom, les membres et les types de leads acceptés par ce groupe."
                : "Créez un nouveau groupe, assignez des collaborateurs et définissez les leads qu'ils peuvent recevoir."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nom
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
             <div className="space-y-2">
                <Label>Collaborateurs</Label>
                <ScrollArea className="h-32 rounded-md border p-4">
                    <div className="space-y-2">
                        {allCollaborators.map(c => (
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
                        ))}
                    </div>
                </ScrollArea>
             </div>
             <div className="space-y-2">
                <Label>Niveaux de Leads Acceptés</Label>
                 <div className="rounded-md border p-4 space-y-2">
                    {leadTiers.map(tier => (
                        <div key={tier} className="flex items-center space-x-2">
                            <Checkbox
                                id={`tier-${tier}`}
                                checked={acceptedTiers.includes(tier)}
                                onCheckedChange={() => handleTierCheckboxChange(tier)}
                            />
                            <Label htmlFor={`tier-${tier}`} className="font-normal">
                                {tier}
                            </Label>
                        </div>
                    ))}
                 </div>
                 <p className="text-xs text-muted-foreground">Cochez les types de leads que ce groupe est autorisé à recevoir.</p>
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
