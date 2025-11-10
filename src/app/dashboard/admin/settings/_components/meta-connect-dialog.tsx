'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { ArrowRight, HelpCircle } from 'lucide-react';
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
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Connecter votre compte Meta</DialogTitle>
            <DialogDescription>
              Entrez votre jeton d'accès pour commencer. Assurez-vous qu'il dispose des bonnes permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
             <div>
                <Label htmlFor="meta-token" className="font-semibold">
                    Jeton d'accès de l'API Graph
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Collez le jeton d'accès que vous avez généré.
                </p>
                <Input
                    id="meta-token"
                    type="password"
                    placeholder="Collez votre jeton d'accès ici"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                />
            </div>
            <Accordion type="single" collapsible>
              <AccordionItem value="help">
                <AccordionTrigger>
                  <div className='flex items-center gap-2'>
                    <HelpCircle className="h-4 w-4" />
                    Comment obtenir un jeton valide ?
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>
                      Allez sur le <Link href="https://developers.facebook.com/tools/explorer/" target="_blank" className="text-primary underline">Graph API Explorer</Link> de Meta.
                    </li>
                    <li>
                      À droite, sous "Permissions", assurez-vous de sélectionner au minimum :
                      <ul className="list-disc list-inside ml-4 mt-1 font-mono text-xs bg-muted p-2 rounded-md">
                        <li>ads_read</li>
                        <li>leads_retrieval</li>
                      </ul>
                    </li>
                    <li>Cliquez sur le bouton "Generate Access Token".</li>
                    <li>Copiez le jeton généré et collez-le dans le champ ci-dessus.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
