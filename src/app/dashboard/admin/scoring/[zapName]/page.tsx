'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useDoc, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { Lead, ScoringRule } from '@/lib/types';
import { collection, query, where, doc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Bot, Save } from 'lucide-react';
import Link from 'next/link';

type RuleSet = {
    [question: string]: {
        [answer: string]: number;
    };
};

export default function ConfigureZapScoringPage() {
  const firestore = useFirestore();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const zapName = useMemo(() => decodeURIComponent(params.zapName as string), [params.zapName]);

  const [rules, setRules] = useState<RuleSet>({});
  const [isSaving, setIsSaving] = useState(false);

  // --- DATA FETCHING ---
  // 1. Get all leads for THIS specific Zap
  const leadsQuery = useMemo(() => query(collection(firestore, 'leads'), where('zapName', '==', zapName)), [firestore, zapName]);
  const { data: leads, isLoading: leadsLoading } = useCollection<Lead>(leadsQuery);

  // 2. Get the existing scoring rule document for this Zap
  const rulesQuery = useMemo(() => query(collection(firestore, 'scoringRules'), where('zapName', '==', zapName)), [firestore, zapName]);
  const { data: existingRules, isLoading: rulesLoading } = useCollection<ScoringRule>(rulesQuery);
  const existingRule = useMemo(() => existingRules?.[0], [existingRules]);
  
  // --- STATE INITIALIZATION ---
  useEffect(() => {
    if (existingRule) {
      setRules(existingRule.rules || {});
    }
  }, [existingRule]);
  
  // --- DATA PROCESSING ---
  // Extract all unique questions and answers from the leads
  const questionsAndAnswers = useMemo(() => {
    if (!leads) return {};
    const qaMap: { [question: string]: Set<string> } = {};
    const excludedKeys = ['id', 'name', 'email', 'phone', 'status', 'tier', 'score', 'leadData', 'assignedCollaboratorId', 'createdAt', 'zapName', 'nom', 'FULL NAME', 'EMAIL', 'PHONE', 'telephone', 'created_time', 'Created Time', 'Form Name', 'nom_campagne'];

    leads.forEach(lead => {
      try {
        const data = JSON.parse(lead.leadData);
        for (const key in data) {
          if (!excludedKeys.includes(key) && data[key] !== null && data[key] !== '') {
            if (!qaMap[key]) {
              qaMap[key] = new Set();
            }
            qaMap[key].add(String(data[key]));
          }
        }
      } catch (e) {
        console.error("Failed to parse leadData", e);
      }
    });

    return qaMap;
  }, [leads]);
  
  const handleScoreChange = (question: string, answer: string, score: string) => {
    const scoreValue = parseInt(score, 10);
    setRules(prev => ({
      ...prev,
      [question]: {
        ...prev[question],
        [answer]: isNaN(scoreValue) ? 0 : scoreValue
      }
    }));
  };
  
  const handleSaveRules = async () => {
    setIsSaving(true);
    
    // Get a list of questions that have at least one rule configured
    const configuredQuestions = Object.keys(rules).filter(question =>
      Object.values(rules[question]).some(score => score > 0)
    );

    const ruleData: Omit<ScoringRule, 'id'> = {
        zapName,
        rules,
        configuredQuestions,
    };
    
    try {
        if (existingRule) {
            // Update existing rule
            const ruleRef = doc(firestore, 'scoringRules', existingRule.id);
            await updateDocumentNonBlocking(ruleRef, ruleData);
        } else {
            // Create new rule
            const rulesColRef = collection(firestore, 'scoringRules');
            await addDocumentNonBlocking(rulesColRef, ruleData);
        }
        
        toast({
            title: 'Règles enregistrées',
            description: `Le scoring pour "${zapName}" a été mis à jour.`
        });
        router.push('/dashboard/admin/scoring'); // Go back to the list
        
    } catch(error) {
        console.error("Error saving rules:", error);
        toast({
            variant: 'destructive',
            title: 'Erreur',
            description: "Une erreur est survenue lors de l'enregistrement."
        })
    } finally {
        setIsSaving(false);
    }
  }
  
  const isLoading = leadsLoading || rulesLoading;

  return (
    <>
      <div className="flex items-center gap-4">
         <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/admin/scoring">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Retour</span>
            </Link>
          </Button>
          <div>
             <h1 className="text-xl font-semibold md:text-3xl">Configuration du Scoring</h1>
             <p className="text-sm text-muted-foreground md:text-base">Pour le Zap: <span className="font-bold text-primary">{zapName}</span></p>
          </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Questions et Réponses Détectées</CardTitle>
          <CardDescription>
            Attribuez des points à chaque réponse pour les questions extraites des leads de ce Zap. Laissez un champ vide ou à 0 pour ne pas attribuer de points.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Analyse des questions pour ce Zap...</p>
          ) : Object.keys(questionsAndAnswers).length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {Object.entries(questionsAndAnswers).map(([question, answers]) => (
                <AccordionItem value={question} key={question}>
                  <AccordionTrigger className="text-base font-medium hover:no-underline">
                    {question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pl-4 pt-2">
                        {[...answers].map(answer => (
                            <div key={answer} className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor={`${question}-${answer}`} className="text-muted-foreground col-span-2 truncate">{answer}</Label>
                                <Input 
                                    id={`${question}-${answer}`}
                                    type="number"
                                    placeholder="0"
                                    value={rules[question]?.[answer] || ''}
                                    onChange={(e) => handleScoreChange(question, answer, e.target.value)}
                                    className="w-full"
                                />
                            </div>
                        ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
             <p className="text-center text-muted-foreground p-8">
              Aucune question ou réponse n'a pu être extraite des leads pour ce Zap.
            </p>
          )}
        </CardContent>
        <CardFooter>
            <Button onClick={handleSaveRules} disabled={isSaving || isLoading}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Enregistrement...' : 'Enregistrer les règles'}
            </Button>
        </CardFooter>
      </Card>
    </>
  );
}

    