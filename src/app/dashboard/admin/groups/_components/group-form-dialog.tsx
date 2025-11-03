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
import type { Group, Collaborator } from '@/lib/types';
import { useEffect, useState } from 'react';

interface GroupFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (groupData: { name: string; collaboratorIds: string[] }) => void;
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

  useEffect(() => {
    if (isOpen) {
      if (group) {
        setName(group.name);
        setSelectedCollaborators(group.collaboratorIds || []);
      } else {
        setName('');
        setSelectedCollaborators([]);
      }
    }
  }, [group, isOpen]);
  
  const handleCheckboxChange = (collaboratorId: string) => {
    setSelectedCollaborators(prev => 
      prev.includes(collaboratorId) 
        ? prev.filter(id => id !== collaboratorId)
        : [...prev, collaboratorId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSave({ name, collaboratorIds: selectedCollaborators });
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{group ? 'Modifier le Groupe' : 'Créer un Groupe'}</DialogTitle>
            <DialogDescription>
              {group
                ? "Modifiez le nom et les membres de ce groupe."
                : "Créez un nouveau groupe et assignez-y des collaborateurs."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
                <ScrollArea className="h-40 rounded-md border p-4">
                    <div className="space-y-2">
                        {allCollaborators.map(c => (
                            <div key={c.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`collaborator-${c.id}`}
                                    checked={selectedCollaborators.includes(c.id)}
                                    onCheckedChange={() => handleCheckboxChange(c.id)}
                                />
                                <Label htmlFor={`collaborator-${c.id}`} className="font-normal">
                                    {c.name}
                                </Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
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
