'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCollection,
  useFirestore,
} from '@/firebase';
import type { Lead } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function AdminScoringPage() {
  const firestore = useFirestore();

  const leadsQuery = useMemo(
    () => collection(firestore, 'leads'),
    [firestore]
  );
  const { data: allLeads, isLoading: leadsLoading } =
    useCollection<Lead>(leadsQuery);

  const zapNames = useMemo(() => {
    if (!allLeads) return [];
    const names = new Set<string>();
    allLeads.forEach((lead) => {
      if (lead.zapName) {
        names.add(lead.zapName);
      }
    });
    return Array.from(names);
  }, [allLeads]);

  const isLoading = leadsLoading;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-3xl">
          Configuration du Scoring IA
        </h1>
      </div>
      <p className="text-sm text-muted-foreground md:text-base">
        Configurez les règles de notation pour chaque formulaire (Zap) afin
        d'affiner la qualification de vos leads.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Formulaires / Zaps Détectés</CardTitle>
          <CardDescription>
            Voici la liste de tous les Zaps qui ont envoyé des prospects dans le
            CRM. Cliquez sur un Zap pour configurer ses règles de notation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground">
              Analyse des leads en cours...
            </p>
          ) : zapNames.length > 0 ? (
            <div className="divide-y divide-border">
              {zapNames.map((zapName) => (
                <div
                  key={zapName}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-primary" />
                    <span className="font-medium">{zapName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">Non configuré</Badge>
                    <Button variant="ghost" size="sm" asChild>
                       <Link href={`/dashboard/admin/scoring/${encodeURIComponent(zapName)}`}>
                         Configurer
                         <ChevronRight className="h-4 w-4 ml-2" />
                       </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground p-8">
              Aucun Zap n'a encore envoyé de prospect.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
