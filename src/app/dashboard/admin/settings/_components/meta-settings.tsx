'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  useCollection,
  useFirestore,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import type { IntegrationSetting } from '@/lib/types';
import { collection, query, where, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function MetaSettings() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [accessToken, setAccessToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const settingsQuery = useMemo(
    () =>
      query(
        collection(firestore, 'integrationSettings'),
        where('integrationName', '==', 'meta')
      ),
    [firestore]
  );

  const { data: settings, isLoading: settingsLoading } =
    useCollection<IntegrationSetting>(settingsQuery);
  const metaSettings = useMemo(() => settings?.[0], [settings]);

  const isConnected = !!metaSettings;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken.trim()) {
      toast({
        variant: 'destructive',
        title: 'Jeton manquant',
        description: "Veuillez fournir un jeton d'accès.",
      });
      return;
    }
    setIsSaving(true);
    try {
      const settingsCollection = collection(firestore, 'integrationSettings');
      await addDocumentNonBlocking(settingsCollection, {
        integrationName: 'meta',
        accessToken: accessToken,
        enabledCampaignIds: [], // Initialise avec aucune campagne activée
      });
      toast({
        title: 'Connecté !',
        description: "L'intégration Meta a été activée avec succès.",
      });
      setAccessToken('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible d'enregistrer les paramètres.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!metaSettings) return;
    setIsSaving(true);
    try {
      const settingRef = doc(firestore, 'integrationSettings', metaSettings.id);
      await deleteDocumentNonBlocking(settingRef);
      toast({
        variant: 'destructive',
        title: 'Déconnecté',
        description: "L'intégration Meta a été désactivée.",
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de supprimer les paramètres.',
      });
    } finally {
      setIsSaving(false);
    }
  };

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
                {settingsLoading
                  ? 'Vérification...'
                  : isConnected
                  ? 'Connecté'
                  : 'Non connecté'}
              </p>
            </div>
          </div>
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Actif' : 'Inactif'}
          </Badge>
        </div>

        {settingsLoading ? (
          <div className="text-center text-sm text-muted-foreground">Chargement...</div>
        ) : isConnected ? (
          <div className="space-y-4">
             <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Intégration Active</AlertTitle>
              <AlertDescription>
                Le système écoute désormais les nouveaux leads provenant des campagnes Meta autorisées.
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleDisconnect}
              disabled={isSaving}
            >
              {isSaving ? 'Déconnexion...' : 'Se déconnecter'}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <Label htmlFor="meta-token" className="font-semibold">
                Étape 1 : Fournir un jeton d'accès
              </Label>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Générez un jeton depuis votre application dans le tableau de bord Meta for Developers et collez-le ici.
              </p>
              <Input
                id="meta-token"
                type="password"
                placeholder="Collez votre jeton d'accès ici"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? 'Connexion...' : "Enregistrer et Connecter"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
