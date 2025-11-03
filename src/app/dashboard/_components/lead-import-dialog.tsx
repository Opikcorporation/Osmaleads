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
import { useToast } from '@/hooks/use-toast';
import { readFileAsText } from '@/lib/file-utils';
import { generateLeadProfile } from '@/ai/flows/generate-lead-profile';
import {
  addDocumentNonBlocking,
  useFirestore,
  useUser,
} from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import type { Lead } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface LeadImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeadImportDialog({ isOpen, onClose }: LeadImportDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file || !user) {
      toast({
        variant: 'destructive',
        title: 'Fichier manquant',
        description: 'Veuillez sélectionner un fichier à importer.',
      });
      return;
    }

    setIsProcessing(true);
    toast({
      title: 'Importation en cours...',
      description: "L'IA analyse votre lead. Veuillez patienter.",
    });

    try {
      const leadData = await readFileAsText(file);
      const fileName = file.name.split('.')[0]; // Use file name as lead name

      const result = await generateLeadProfile({ leadData });

      const newLead: Partial<Lead> = {
        name: fileName,
        company: 'N/A', // Placeholder, AI might extract this
        email: 'N/A',
        phone: 'N/A',
        username: fileName.toLowerCase().replace(/\s/g, ''),
        createdAt: serverTimestamp() as any, // Let Firestore handle the timestamp
        status: 'New',
        assignedCollaboratorId: null, // Unassigned initially
        aiProfile: result.profile,
        leadData: leadData,
        score: result.score,
        tier: result.tier,
      };

      const leadsColRef = collection(firestore, 'leads');
      await addDocumentNonBlocking(leadsColRef, newLead);

      toast({
        title: 'Lead importé avec succès!',
        description: `Le lead "${fileName}" a été analysé, noté ${result.score}/100 et ajouté.`,
      });
      handleClose();
    } catch (error) {
      console.error('Error importing lead:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur lors de l\'importation',
        description:
          "Une erreur s'est produite lors de l'analyse ou de la sauvegarde du lead.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Importer un Lead</DialogTitle>
          <DialogDescription>
            Téléchargez un fichier .txt ou .csv contenant les informations du
            lead. L'IA se chargera de générer un profil complet, un score et une catégorie.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lead-file" className="text-right">
              Fichier
            </Label>
            <Input
              id="lead-file"
              type="file"
              onChange={handleFileChange}
              className="col-span-3"
              accept=".txt,.csv"
              disabled={isProcessing}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Annuler
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              'Importer et Analyser'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
