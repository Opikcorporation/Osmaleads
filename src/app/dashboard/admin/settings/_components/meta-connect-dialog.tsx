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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface MetaConnectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (accessToken: string) => void;
  isConnecting: boolean;
}

export function MetaConnectDialog({
  isOpen,
  onClose,
  onConnect,
  isConnecting,
}: MetaConnectDialogProps) {
  const [accessToken, setAccessToken] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken.trim()) {
      toast({
        variant: 'destructive',
        title: 'Jeton manquant',
        description: "Veuillez coller votre jeton d'accès pour continuer.",
      });
      return;
    }
    onConnect(accessToken);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Se connecter à l'API Meta</DialogTitle>
            <DialogDescription>
              Collez votre jeton d'accès utilisateur pour autoriser l'application à accéder à vos campagnes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="access-token">
                Jeton d'Accès Utilisateur
              </Label>
              <Textarea
                id="access-token"
                placeholder="Collez le jeton d'accès ici..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="min-h-[120px] font-mono text-xs"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Besoin d'aide ? Consultez l'
              <Link href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Explorateur de l'API Graph
              </Link>
              {' '}pour générer un nouveau jeton avec les autorisations requises.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isConnecting}>
              Annuler
            </Button>
            <Button type="submit" disabled={!accessToken || isConnecting}>
              {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isConnecting ? 'Connexion...' : 'Se connecter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
