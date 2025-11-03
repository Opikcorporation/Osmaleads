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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Collaborator } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CollaboratorFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  collaborator: Collaborator | null;
}

export function CollaboratorFormDialog({
  isOpen,
  onClose,
  onSave,
  collaborator,
}: CollaboratorFormDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'collaborator'>('collaborator');
  const { toast } = useToast();

  const isEditMode = !!collaborator;

  useEffect(() => {
    if (isOpen) {
      if (collaborator) {
        setName(collaborator.name);
        setEmail(collaborator.email || '');
        setRole(collaborator.role);
        setPassword(''); // Don't show password on edit
      } else {
        // Reset form for creation
        setName('');
        setEmail('');
        setPassword('');
        setRole('collaborator');
      }
    }
  }, [collaborator, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || (!isEditMode && !password)) {
        toast({
            variant: "destructive",
            title: "Champs manquants",
            description: "Veuillez remplir tous les champs obligatoires.",
        });
      return;
    }
    
    if (isEditMode) {
        toast({
            title: "Non implémenté",
            description: "La modification des collaborateurs n'est pas encore prise en charge.",
        });
        return;
    }

    onSave({ name, email, password, role });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Modifier le Collaborateur' : 'Créer un Collaborateur'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Modifier les détails de ce collaborateur."
                : "Créer un nouveau compte. Un mot de passe temporaire sera défini."}
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                required
                disabled={isEditMode}
              />
            </div>
            {!isEditMode && (
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">
                        Mot de passe
                    </Label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="col-span-3"
                        required
                    />
                </div>
            )}
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                    Rôle
                </Label>
                 <Select onValueChange={(value) => setRole(value as any)} value={role} required>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="collaborator">Collaborateur</SelectItem>
                        <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
