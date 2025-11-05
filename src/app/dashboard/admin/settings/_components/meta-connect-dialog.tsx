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
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface MetaConnectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (accessToken: string) => void;
  isSaving: boolean;
}

export function MetaConnectDialog({
  isOpen,
  onClose,
  onSave,
  isSaving,
}: MetaConnectDialogProps) {
  const [accessToken, setAccessToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(accessToken);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Connecter votre compte Meta</DialogTitle>
            <DialogDescription>
              Entrez votre jeton d'accès pour commencer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
             <div>
                <Label htmlFor="meta-token" className="font-semibold">
                    Jeton d'accès de l'API Graph
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Générez un jeton depuis votre application dans le 
                    <Link href="https://developers.facebook.com/tools/explorer/" target="_blank" className="text-primary underline hover:text-primary/80">
                        Graph API Explorer de Meta
                    </Link>
                    et collez-le ici.
                </p>
                <Input
                    id="meta-token"
                    type="password"
                    placeholder="Collez votre jeton d'accès ici"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSaving || !accessToken}>
              {isSaving ? 'Connexion...' : 'Enregistrer et Connecter'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
