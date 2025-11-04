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
import { useState, useMemo } from 'react';
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
import { parseCSV } from '../page';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

export type ScoreRule = { value: string; score: number };
export type AllScoreRules = { [columnName: string]: ScoreRule[] };

interface LeadImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    fileContent: string;
    mapping: { [key: string]: string };
    scoreColumns: string[];
    allScoreRules: AllScoreRules;
  }) => void;
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
  const [scoreColumns, setScoreColumns] = useState<string[]>([]);
  const [allScoreRules, setAllScoreRules] = useState<AllScoreRules>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentScoreColumnIndex, setCurrentScoreColumnIndex] = useState(0);

  const resetState = () => {
    setStep(1);
    setFile(null);
    setFileContent('');
    setHeaders([]);
    setMapping({});
    setScoreColumns([]);
    setAllScoreRules({});
    setIsProcessing(false);
    setCurrentScoreColumnIndex(0);
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
      const { headers: parsedHeaders } = parseCSV(content);
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
  
  const handleGoToStep4 = () => {
    if (scoreColumns.length === 0) {
        handleSubmit(); // If no score column, just submit
        return;
    }
    setCurrentScoreColumnIndex(0);
    prepareRulesForColumn(scoreColumns[0]);
    setStep(4);
  }

  const prepareRulesForColumn = (column: string) => {
    // Only prepare if not already done
    if (allScoreRules[column]) return;

    const { rows } = parseCSV(fileContent);
    const values = new Set(rows.map(row => row[column]).filter(Boolean));
    const newRules = Array.from(values).map(value => ({ value, score: 0 }));
    setAllScoreRules(prev => ({...prev, [column]: newRules}));
  }

  const handleScoreColumnToggle = (column: string) => {
    setScoreColumns(prev => 
      prev.includes(column) 
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  }

  const handleScoreRuleChange = (column: string, value: string, score: number) => {
    setAllScoreRules(prev => ({
      ...prev,
      [column]: prev[column]?.map(rule => rule.value === value ? { ...rule, score } : rule) || []
    }));
  }
  
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSave({ fileContent, mapping, scoreColumns, allScoreRules });
    resetState();
  };

  const handleNextScoreColumn = () => {
    if (currentScoreColumnIndex < scoreColumns.length - 1) {
      const nextIndex = currentScoreColumnIndex + 1;
      prepareRulesForColumn(scoreColumns[nextIndex]);
      setCurrentScoreColumnIndex(nextIndex);
    } else {
      // Last column, go to final submission
      handleSubmit();
    }
  }

  const handlePrevScoreColumn = () => {
     if (currentScoreColumnIndex > 0) {
      setCurrentScoreColumnIndex(currentScoreColumnIndex - 1);
    } else {
      // Back to step 3
      setStep(3);
    }
  }

  const totalSteps = scoreColumns.length > 0 ? 4 : 3;
  const currentScoreColumn = scoreColumns[currentScoreColumnIndex];
  const uniqueScoreValues = allScoreRules[currentScoreColumn] || [];


  return (
    <Dialog open={isOpen} onOpenChange={resetState}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Importer des Leads (Étape {step}/{totalSteps})</DialogTitle>
            <DialogDescription>
              {step === 1 && 'Téléversez un fichier CSV contenant vos leads.'}
              {step === 2 && 'Mappez les colonnes de votre fichier aux champs de destination.'}
              {step === 3 && 'Optionnel : Choisissez une ou plusieurs colonnes pour définir le score des leads.'}
              {step === 4 && `Attribuez des points pour chaque valeur de la colonne "${currentScoreColumn}".`}
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
                        <Select onValueChange={value => setMapping(prev => ({...prev, [header]: value}))}>
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
            <div className="py-6 space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                <Label className="text-base font-semibold">Configuration du Score (Optionnel)</Label>
                 <p className="text-sm text-muted-foreground">Sélectionnez les colonnes qui détermineront le score du lead. Le score final sera la moyenne des points de chaque colonne sélectionnée.</p>
                <div className="space-y-3 rounded-md border p-4">
                    {headers.map(header => (
                        <div key={header} className="flex items-center space-x-3">
                            <Checkbox
                                id={`score-col-${header}`}
                                onCheckedChange={() => handleScoreColumnToggle(header)}
                                checked={scoreColumns.includes(header)}
                            />
                            <Label htmlFor={`score-col-${header}`} className="font-normal truncate">
                                {header}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {step === 4 && (
            <div className="py-6 space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                 <div className='space-y-2 mb-4'>
                    <Progress value={((currentScoreColumnIndex + 1) / scoreColumns.length) * 100} />
                    <p className="text-sm text-muted-foreground">Configuration de la colonne {currentScoreColumnIndex + 1} sur {scoreColumns.length}. Plus le nombre de points est élevé, meilleur est le lead.</p>
                 </div>
                 {uniqueScoreValues.map(rule => (
                    <div key={rule.value} className="grid grid-cols-3 items-center gap-4">
                        <Badge variant="secondary" className="justify-center truncate">{rule.value}</Badge>
                        <Input
                            type="number"
                            placeholder="Points"
                            className="col-span-2"
                            onChange={(e) => handleScoreRuleChange(currentScoreColumn, rule.value, parseInt(e.target.value, 10) || 0)}
                            defaultValue={rule.score}
                        />
                    </div>
                ))}
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
                    <Button type="button" onClick={handleGoToStep4}>
                       {scoreColumns.length > 0 ? 'Définir les Points' : 'Importer sans Score'} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </>
            )}
            {step === 4 && (
                <>
                     <Button type="button" variant="ghost" onClick={handlePrevScoreColumn}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
                    </Button>
                    {currentScoreColumnIndex < scoreColumns.length - 1 ? (
                        <Button type="button" onClick={handleNextScoreColumn}>
                            Suivant <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button type="submit">
                            Importer et Calculer les Scores
                        </Button>
                    )}
                </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
