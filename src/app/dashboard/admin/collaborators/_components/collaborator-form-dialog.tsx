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
import { AvatarSelectionDialog } from './avatar-selection-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'collaborator'>('collaborator');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  
  const { toast } = useToast();

  const isEditMode = !!collaborator;

  useEffect(() => {
    if (isOpen) {
      if (collaborator) {
        setName(collaborator.name);
        setUsername(collaborator.username || '');
        setRole(collaborator.role);
        setAvatarUrl(collaborator.avatarUrl);
        setPassword(''); // Don't show password on edit
      } else {
        // Reset form for creation
        const defaultAvatar = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];
        setName('');
        setUsername('');
        setPassword('');
        setRole('collaborator');
        setAvatarUrl(defaultAvatar.imageUrl);
      }
    }
  }, [collaborator, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode && (!name || !username)) {
      toast({
            variant: "destructive",
            title: "Champs manquants",
            description: "Le nom et le nom d'utilisateur sont requis.",
        });
      return;
    }

    if (!isEditMode && (!name || !username || !password)) {
        toast({
            variant: "destructive",
            title: "Champs manquants",
            description: "Veuillez remplir tous les champs obligatoires.",
        });
      return;
    }
    
    // For edit mode, we only save name and role.
    if (isEditMode) {
        onSave({ name, role, avatarUrl });
    } else {
        onSave({ name, username, password, role, avatarUrl });
    }
  };

  return (
    <>
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
             {isEditMode && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Avatar</Label>
                    <div className="col-span-3 flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={avatarUrl} alt={name} />
                            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsAvatarDialogOpen(true)}>
                            Changer
                        </Button>
                    </div>
                </div>
            )}
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
              <Label htmlFor="username" className="text-right">
                Nom d'utilisateur
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
    <AvatarSelectionDialog
        isOpen={isAvatarDialogOpen}
        onClose={() => setIsAvatarDialogOpen(false)}
        onSelect={(newAvatarUrl) => {
            setAvatarUrl(newAvatarUrl);
            setIsAvatarDialogOpen(false);
        }}
    />
    </>
  );
}
