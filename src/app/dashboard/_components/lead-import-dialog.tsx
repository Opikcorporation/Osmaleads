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
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsText } from '@/lib/file-utils';
import { UploadCloud, ArrowRight, ArrowLeft } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { leadTiers, type LeadTier } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const parseCSVHeaders = (content: string): string[] => {
  const firstLine = content.split('\n')[0];
  if (!firstLine) return [];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  return firstLine.split(delimiter).map(h => h.trim().replace(/"/g, ''));
};


interface LeadImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { fileContent: string; mapping: { [key: string]: string }, tier: LeadTier }) => void;
}

export function LeadImportDialog({
  isOpen,
  onClose,
  onSave,
}: LeadImportDialogProps) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{ [key: string]: string }>({});
  const [tier, setTier] = useState<LeadTier | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const resetState = () => {
    setStep(1);
    setFile(null);
    setFileContent('');
    setHeaders([]);
    setMapping({});
    setTier(undefined);
    setIsProcessing(false);
    onClose();
  };

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
  
  const handleGoToStep2 = async () => {
    if (!file) {
      toast({ variant: 'destructive', title: 'Aucun fichier sélectionné' });
      return;
    }
    setIsProcessing(true);
    try {
      const content = await readFileAsText(file);
      const parsedHeaders = parseCSVHeaders(content);
      if (parsedHeaders.length === 0) {
        toast({ variant: 'destructive', title: 'Fichier invalide', description: 'Impossible de détecter les colonnes dans ce fichier.' });
        setIsProcessing(false);
        return;
      }
      setFileContent(content);
      setHeaders(parsedHeaders);
      setStep(2);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur de lecture', description: 'Impossible de lire le fichier.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoToStep3 = () => {
     if (Object.values(mapping).filter(v => v === 'name').length === 0) {
      toast({ variant: 'destructive', title: 'Mappage incomplet', description: 'Veuillez mapper une colonne pour le champ "Nom".' });
      return;
    }
    setStep(3);
  }
  
  const handleMappingChange = (header: string, field: string) => {
    setMapping(prev => ({ ...prev, [header]: field }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tier) {
        toast({ variant: 'destructive', title: 'Tier manquant', description: 'Veuillez sélectionner un tier pour ce lot de leads.' });
        return;
    }
    onSave({ fileContent, mapping, tier });
    resetState();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetState}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Importer des Leads (Étape {step}/3)</DialogTitle>
            <DialogDescription>
              {step === 1 && 'Téléversez un fichier CSV contenant vos leads.'}
              {step === 2 && 'Mappez les colonnes de votre fichier aux champs de destination.'}
              {step === 3 && 'Choisissez le tier de qualité pour ce lot de leads.'}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="py-6">
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
                <p className="text-xs text-muted-foreground">Fichiers CSV</p>
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".csv"
                />
              </div>
            </div>
          )}

          {step === 2 && (
             <div className="py-6 space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                <p className="text-sm text-muted-foreground">Indiquez quelle colonne de votre fichier correspond aux champs de LeadFlowAI. Le champ "Nom" est obligatoire.</p>
                {headers.map(header => (
                    <div key={header} className="grid grid-cols-2 items-center gap-4">
                        <Label htmlFor={`header-${header}`} className="text-right font-medium truncate">{header}</Label>
                        <Select onValueChange={value => handleMappingChange(header, value)}>
                            <SelectTrigger id={`header-${header}`}>
                                <SelectValue placeholder="Ignorer cette colonne" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ignore">Ignorer</SelectItem>
                                <SelectItem value="name">Nom</SelectItem>
                                <SelectItem value="phone">Téléphone</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="company">Entreprise</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                ))}
             </div>
          )}

          {step === 3 && (
            <div className="py-6">
              <RadioGroup onValueChange={(value) => setTier(value as LeadTier)} value={tier} className="grid grid-cols-1 gap-4">
                {leadTiers.map((tierOption) => (
                    <Label key={tierOption} htmlFor={tierOption} className="flex items-center gap-4 rounded-md border p-4 cursor-pointer hover:bg-accent has-[div:first-child:has([data-state=checked])]:border-primary">
                        <RadioGroupItem value={tierOption} id={tierOption} />
                        <div>
                            <p className="font-semibold">{tierOption}</p>
                            <p className="text-sm text-muted-foreground">
                                {tierOption === 'Haut de gamme' && 'Pour vos leads les plus prometteurs.'}
                                {tierOption === 'Moyenne gamme' && 'Pour les leads standards.'}
                                {tierOption === 'Bas de gamme' && 'Pour les leads à faible priorité.'}
                            </p>
                        </div>
                    </Label>
                ))}
              </RadioGroup>
            </div>
          )}
          
          <DialogFooter>
            {step === 1 && (
              <>
                <Button type="button" variant="ghost" onClick={resetState}>Annuler</Button>
                <Button type="button" onClick={handleGoToStep2} disabled={!file || isProcessing}>
                    {isProcessing ? 'Analyse...' : 'Suivant'} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
             {step === 2 && (
              <>
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
                </Button>
                <Button type="button" onClick={handleGoToStep3}>
                    Suivant <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
            {step === 3 && (
                <>
                    <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
                    </Button>
                    <Button type="submit" disabled={!tier}>Importer les Leads</Button>
                </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
