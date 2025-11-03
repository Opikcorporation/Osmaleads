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
import { UploadCloud } from 'lucide-react';

interface LeadImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { leadData: string; fileName: string }) => void;
}

export function LeadImportDialog({
  isOpen,
  onClose,
  onSave,
}: LeadImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'Aucun fichier sélectionné',
        description: 'Veuillez sélectionner un fichier à importer.',
      });
      return;
    }
    setIsProcessing(true);
    try {
      const leadData = await readFileAsText(file);
      onSave({ leadData, fileName: file.name });
    } catch (error) {
      console.error('File read error:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur de lecture du fichier',
        description: 'Impossible de lire le contenu du fichier sélectionné.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const resetState = () => {
    setFile(null);
    setIsProcessing(false);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={resetState}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Importer un Lead</DialogTitle>
            <DialogDescription>
              Téléversez un fichier (CSV, TXT) contenant les informations du lead. L'IA générera un profil détaillé.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-6">
            <div 
              className="relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <UploadCloud className="w-12 h-12 text-muted-foreground" />
              <p className="mt-4 text-sm font-semibold text-center">
                {file ? file.name : 'Glissez-déposez ou cliquez pour téléverser'}
              </p>
              <p className="text-xs text-muted-foreground">
                Fichiers texte (CSV, TXT, etc.)
              </p>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".csv,.txt,text/plain"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={resetState} disabled={isProcessing}>
              Annuler
            </Button>
            <Button type="submit" disabled={!file || isProcessing}>
              {isProcessing ? 'Analyse en cours...' : 'Générer le Profil & Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
