'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, ArrowRight, Plug } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  useCollection,
  useFirestore,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import type { IntegrationSetting } from '@/lib/types';
import { collection, query, where, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { MetaConnectDialog } from './meta-connect-dialog';


type MetaCampaign = {
  id: string;
  name: string;
  account: string;
};

export function MetaSettings() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);

  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);


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

  // --- EFFECT TO FETCH CAMPAIGNS ---
  useEffect(() => {
    if (isConnected) {
      setCampaignsLoading(true);
      setCampaignsError(null);
      fetch('/api/meta/campaigns')
        .then(async res => {
            if (!res.ok) {
                // Try to parse JSON, but handle cases where body is not JSON
                try {
                    const errData = await res.json();
                     throw new Error(errData.details?.error?.message || errData.error || 'La réponse du serveur n\'était pas OK.');
                } catch(e) {
                    // If res.json() fails, it means the response was not valid JSON.
                    // This can happen with some network errors or non-JSON API error responses.
                    throw new Error(`Erreur de communication avec l'API Meta. Le token est probablement invalide ou a expiré.`);
                }
            }
            return res.json();
        })
        .then(data => {
            if(data.error) {
                 throw new Error(data.details?.error?.message || data.error || 'Erreur lors de la récupération des campagnes.');
            }
            setCampaigns(data.campaigns || []);
        })
        .catch(err => {
            console.error(err);
            setCampaignsError(err.message || 'Impossible de charger les campagnes. Vérifiez le jeton d\'accès.');
        })
        .finally(() => {
            setCampaignsLoading(false);
        });
    } else {
        setCampaigns([]);
    }
  }, [isConnected]);


  const handleConnect = async (accessToken: string) => {
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
        enabledCampaignIds: [],
      });
      toast({
        title: 'Connecté !',
        description: "L'intégration Meta a été activée avec succès.",
      });
      setIsConnectDialogOpen(false); // Close dialog on success
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

  const handleCampaignToggle = (campaignId: string) => {
    if (!metaSettings) return;
    const settingRef = doc(firestore, 'integrationSettings', metaSettings.id);
    
    const currentlyEnabled = metaSettings.enabledCampaignIds || [];
    const isEnabled = currentlyEnabled.includes(campaignId);
    
    let updatedIds;
    if (isEnabled) {
      updatedIds = currentlyEnabled.filter(id => id !== campaignId);
    } else {
      updatedIds = [...currentlyEnabled, campaignId];
    }
    
    updateDocumentNonBlocking(settingRef, { enabledCampaignIds: updatedIds });
  };
  
  if (settingsLoading) {
    return <div className="text-center text-sm text-muted-foreground p-8">Chargement des paramètres...</div>
  }

  return (
    <>
    <div className="space-y-8">
      {!isConnected ? (
         <Card>
            <CardHeader>
                <CardTitle>Étape 1 : Connecter votre compte Meta</CardTitle>
                <CardDescription>
                   Cliquez sur le bouton ci-dessous pour fournir un jeton d'accès et activer la synchronisation des leads.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => setIsConnectDialogOpen(true)}>
                    <Plug className="mr-2 h-4 w-4" /> Connecter mon compte Meta
                </Button>
            </CardContent>
         </Card>
      ) : (
        <>
            <Alert variant="default" className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Étape 1 : Intégration Active</AlertTitle>
              <AlertDescription className="text-green-700">
                Vous êtes connecté à Meta. Le système écoute les nouveaux leads provenant des campagnes sélectionnées ci-dessous.
              </AlertDescription>
            </Alert>
            <Card>
                <CardHeader>
                    <CardTitle>Étape 2 : Sélectionner les Campagnes</CardTitle>
                    <CardDescription>
                        Cochez les campagnes pour lesquelles vous souhaitez importer les leads. Les modifications sont enregistrées automatiquement.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-64 w-full rounded-md border p-4">
                        {campaignsLoading ? (
                            <p className="text-sm text-muted-foreground">Chargement des campagnes...</p>
                        ) : campaignsError ? (
                            <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erreur de chargement</AlertTitle>
                            <AlertDescription>{campaignsError}</AlertDescription>
                            </Alert>
                        ) : campaigns.length > 0 ? (
                            campaigns.map(campaign => (
                                <div key={campaign.id} className="flex items-center space-x-2 py-1">
                                    <Checkbox
                                        id={`campaign-${campaign.id}`}
                                        checked={metaSettings.enabledCampaignIds?.includes(campaign.id)}
                                        onCheckedChange={() => handleCampaignToggle(campaign.id)}
                                    />
                                    <Label htmlFor={`campaign-${campaign.id}`} className="font-normal flex flex-col">
                                        <span>{campaign.name}</span>
                                        <span className="text-xs text-muted-foreground">{campaign.account} - ID: {campaign.id}</span>
                                    </Label>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">Aucune campagne active trouvée ou le jeton est invalide.</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
            <div className="flex justify-end">
                 <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={isSaving}
                    >
                    {isSaving ? 'Déconnexion...' : 'Se déconnecter de Meta'}
                </Button>
            </div>
        </>
      )}
    </div>
    <MetaConnectDialog 
        isOpen={isConnectDialogOpen}
        onClose={() => setIsConnectDialogOpen(false)}
        onSave={handleConnect}
        isSaving={isSaving}
    />
    </>
  );
}
