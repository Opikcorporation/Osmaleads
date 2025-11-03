'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Collaborator } from '@/lib/types';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface BulkAssignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (collaboratorId: string) => void;
  collaborators: Collaborator[];
  isProcessing: boolean;
}

export function BulkAssignDialog({
  isOpen,
  onClose,
  onAssign,
  collaborators,
  isProcessing
}: BulkAssignDialogProps) {
  const [selectedCollaborator, setSelectedCollaborator] = useState<string | undefined>();
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollaborator) {
        toast({
            variant: "destructive",
            title: "Aucun collaborateur sélectionné",
            description: "Veuillez sélectionner un collaborateur à qui assigner les leads.",
        });
      return;
    }
    onAssign(selectedCollaborator);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Assigner les leads</DialogTitle>
            <DialogDescription>
              Sélectionnez un collaborateur pour lui assigner les leads sélectionnés.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Select onValueChange={setSelectedCollaborator} value={selectedCollaborator}>
                <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un collaborateur" />
                </SelectTrigger>
                <SelectContent>
                    {collaborators.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isProcessing}>
              Annuler
            </Button>
            <Button type="submit" disabled={!selectedCollaborator || isProcessing}>
              {isProcessing ? 'Assignation...' : 'Assigner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
