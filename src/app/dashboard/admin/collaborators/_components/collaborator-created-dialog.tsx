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
import { useToast } from '@/hooks/use-toast';
import type { Collaborator } from '@/lib/types';
import { Copy, Check } from 'lucide-react';
import { useState, useMemo } from 'react';

interface CollaboratorCreatedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Collaborator;
  generatedPassword?: string;
}

export function CollaboratorCreatedDialog({
  isOpen,
  onClose,
  profile,
  generatedPassword
}: CollaboratorCreatedDialogProps) {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = useState(false);

  const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '';

  const welcomeMessage = useMemo(() => {
    return `Bonjour ${profile.name},

Toute l'équipe d'Osmaleads vous souhaite la bienvenue !

Votre compte a été créé avec succès. Vous pouvez dès maintenant vous connecter à votre espace personnel à l'aide des identifiants suivants :

Identifiant : ${profile.username}
Mot de passe : ${generatedPassword}

Pour vous connecter : ${loginUrl}`;
  }, [profile, generatedPassword, loginUrl]);


  const handleCopy = () => {
    navigator.clipboard.writeText(welcomeMessage).then(() => {
      setHasCopied(true);
      toast({
        title: 'Copié !',
        description: 'Le message de bienvenue a été copié dans le presse-papiers.',
      });
      setTimeout(() => setHasCopied(false), 2000); // Reset after 2 seconds
    }, (err) => {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de copier le message.',
      });
    });
  };

  if (!profile || !generatedPassword) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Collaborateur Créé avec Succès !</DialogTitle>
            <DialogDescription>
              Vous pouvez maintenant copier ce message et l'envoyer au nouveau collaborateur.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted p-4 rounded-md border text-sm text-muted-foreground whitespace-pre-wrap">
              {welcomeMessage}
            </div>
          </div>
          <DialogFooter className='sm:justify-between sm:gap-2'>
             <Button type="button" variant="ghost" onClick={onClose}>
              Fermer
            </Button>
            <Button type="button" onClick={handleCopy}>
                {hasCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {hasCopied ? 'Copié' : 'Copier le Message'}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
