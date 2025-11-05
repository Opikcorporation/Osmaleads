'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import type { IntegrationSetting } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';

export function MetaSettings() {
  const firestore = useFirestore();

  // On se contente de lire les paramètres
  const settingsQuery = useMemo(
    () => query(collection(firestore, 'integrationSettings'), where('integrationName', '==', 'meta')),
    [firestore]
  );
  
  const { data: settings, isLoading: settingsLoading } = useCollection<IntegrationSetting>(settingsQuery);
  const metaSettings = useMemo(() => settings?.[0], [settings]);

  const isConnected = !!metaSettings;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intégration Meta (Facebook)</CardTitle>
        <CardDescription>
          Connectez votre compte Meta pour synchroniser automatiquement les leads
          de vos campagnes publicitaires.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <AlertCircle className="h-6 w-6 text-destructive" />
            )}
            <div>
              <h3 className="font-semibold">Statut</h3>
              <p className="text-sm text-muted-foreground">
                {settingsLoading ? 'Vérification...' : (isConnected ? 'Connecté' : 'Non connecté')}
              </p>
            </div>
          </div>
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Actif' : 'Inactif'}
          </Badge>
        </div>
        
        {!isConnected && !settingsLoading && (
            <div className="space-y-4 rounded-lg border border-dashed p-6 text-center">
                 <p className="text-sm text-muted-foreground">
                    La fonctionnalité de connexion pour ajouter votre jeton d'accès sera bientôt disponible.
                </p>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
