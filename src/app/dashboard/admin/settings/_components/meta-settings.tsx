'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import type { IntegrationSetting } from '@/lib/types';
import { collection, query, where, writeBatch, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


// Placeholder data for campaigns. In a real app, this would be fetched from the Meta API.
const MOCK_CAMPAIGNS = [
    { id: 'CAMPAGNE_VENTE_A', name: 'Campagne de Vente - Hiver 2024' },
    { id: 'CAMPAGNE_VENTE_B', name: 'Offre Spéciale - Printemps 2024' },
    { id: 'CAMPAGNE_RECRUTEMENT_A', name: 'Recrutement - Développeurs' },
    { id: 'CAMPAGNE_NOTORIETE', name: 'Notoriété - Marque France' },
];

export function MetaSettings() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [accessToken, setAccessToken] = useState('');

  const settingsQuery = useMemo(
    () => query(collection(firestore, 'integrationSettings'), where('integrationName', '==', 'meta')),
    [firestore]
  );
  
  const { data: settings, isLoading: settingsLoading } = useCollection<IntegrationSetting>(settingsQuery);
  const metaSettings = useMemo(() => settings?.[0], [settings]);
  
  useEffect(() => {
    if (metaSettings) {
        setAccessToken(metaSettings.accessToken);
    } else {
        setAccessToken('');
    }
  }, [metaSettings]);

  const handleConnect = async () => {
    if (!firestore || !accessToken) {
        toast({ variant: 'destructive', title: 'Jeton manquant', description: 'Veuillez fournir un jeton d\'accès.'});
        return;
    };
    setIsProcessing(true);
    try {
        const batch = writeBatch(firestore);
        // If settings already exist, update them. Otherwise, create new ones.
        const settingRef = metaSettings ? doc(firestore, 'integrationSettings', metaSettings.id) : doc(collection(firestore, 'integrationSettings'));
        
        const newSetting: Omit<IntegrationSetting, 'id'> = {
            integrationName: 'meta',
            enabledCampaignIds: metaSettings?.enabledCampaignIds || [],
            accessToken: accessToken 
        }
        
        if(metaSettings) {
            batch.update(settingRef, { accessToken });
        } else {
            batch.set(settingRef, newSetting);
        }

        await batch.commit();

        toast({ title: 'Connecté à Meta', description: 'Vous pouvez maintenant configurer vos campagnes.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de sauvegarder le jeton.' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!firestore || !metaSettings) return;
    setIsProcessing(true);
    try {
        const batch = writeBatch(firestore);
        const settingRef = doc(firestore, 'integrationSettings', metaSettings.id);
        batch.delete(settingRef);
        await batch.commit();

        toast({ variant: 'destructive', title: 'Déconnecté de Meta', description: 'La synchronisation des leads est arrêtée.' });
    } catch (error) {
         toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de se déconnecter.' });
    } finally {
        setIsProcessing(false);
    }
  }

  const handleCampaignToggle = async (campaignId: string) => {
    if (!firestore || !metaSettings) return;

    const currentlyEnabled = metaSettings.enabledCampaignIds || [];
    const isEnabled = currentlyEnabled.includes(campaignId);
    
    const updatedCampaignIds = isEnabled
        ? currentlyEnabled.filter(id => id !== campaignId)
        : [...currentlyEnabled, campaignId];

    try {
        const settingRef = doc(firestore, 'integrationSettings', metaSettings.id);
        updateDocumentNonBlocking(settingRef, { enabledCampaignIds: updatedCampaignIds });

        toast({
            title: `Campagne ${isEnabled ? 'désactivée' : 'activée'}`,
            description: `Les leads de cette campagne seront ${isEnabled ? 'ignorés' : 'synchronisés'}.`
        });

    } catch (error) {
         toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de mettre à jour la campagne.' });
    }
  }


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
            {metaSettings ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <AlertCircle className="h-6 w-6 text-destructive" />
            )}
            <div>
              <h3 className="font-semibold">Statut</h3>
              <p className="text-sm text-muted-foreground">
                {settingsLoading ? 'Vérification...' : (metaSettings ? 'Connecté' : 'Non connecté')}
              </p>
            </div>
          </div>
          <Badge variant={metaSettings ? 'default' : 'destructive'}>
            {metaSettings ? 'Actif' : 'Inactif'}
          </Badge>
        </div>
        
        {!metaSettings ? (
            <div className="space-y-4 rounded-lg border border-dashed p-6">
                <div className="space-y-2">
                    <Label htmlFor="access-token" className="text-base font-semibold">Étape 1 : Fournir un jeton d'accès</Label>
                    <p className="text-sm text-muted-foreground">
                        Pour connecter votre compte, vous devez générer un jeton d'accès depuis votre application sur
                        <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="text-primary underline"> Meta for Developers</a>.
                        Ce jeton doit avoir les permissions `leads_retrieval` et `pages_read_engagement`.
                    </p>
                    <Input id="access-token" placeholder="Collez votre jeton d'accès ici" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} />
                </div>
                 <Button onClick={handleConnect} disabled={isProcessing || settingsLoading || !accessToken}>
                    {isProcessing ? 'Connexion...' : 'Enregistrer et Connecter'}
                </Button>
            </div>
        ) : (
            <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold">
                    Étape 2 : Configuration des Campagnes
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Cochez les campagnes dont vous souhaitez importer les leads. Seuls les leads des campagnes sélectionnées seront ajoutés.
                  </p>
                  <div className="mt-4 rounded-lg border p-6 space-y-4">
                    {settingsLoading ? (
                         <div className="space-y-4">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-6 w-1/2" />
                         </div>
                    ) : metaSettings ? (
                        MOCK_CAMPAIGNS.map(campaign => (
                            <div key={campaign.id} className="flex items-center space-x-3">
                                <Checkbox
                                    id={`campaign-${campaign.id}`}
                                    checked={metaSettings?.enabledCampaignIds?.includes(campaign.id) || false}
                                    onCheckedChange={() => handleCampaignToggle(campaign.id)}
                                    disabled={!metaSettings}
                                />
                                <Label htmlFor={`campaign-${campaign.id}`} className="font-normal text-sm">
                                    {campaign.name} <span className="text-xs text-muted-foreground">({campaign.id})</span>
                                </Label>
                            </div>
                        ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center">
                        Une erreur est survenue lors du chargement des paramètres.
                      </p>
                    )}
                  </div>
                </div>
            </>
        )}


      </CardContent>
      {metaSettings && (
          <CardFooter className="border-t px-6 py-4">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isProcessing}>
                        {isProcessing ? 'Déconnexion...' : 'Se déconnecter de Meta'}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr de vouloir vous déconnecter ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            La synchronisation automatique des leads sera arrêtée. Vous devrez fournir un nouveau jeton pour la réactiver.
                            Vos campagnes sélectionnées seront conservées mais inactives.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisconnect}>
                            Oui, me déconnecter
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
      )}
    </Card>
  );
}
