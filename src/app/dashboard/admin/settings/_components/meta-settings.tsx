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
import { AlertCircle, CheckCircle2, ArrowRight, Plug, BellRing, Loader2 } from 'lucide-react';
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

type MetaCampaign = {
  id: string;
  name: string;
  account: string; // This is the Page Name
  page_id: string; // The Page ID
  subscribed: boolean;
};

export function MetaSettings() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [subscribingPageId, setSubscribingPageId] = useState<string | null>(null);

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

  const fetchCampaigns = () => {
    if (!isConnected) return;

    setCampaignsLoading(true);
    setCampaignsError(null);
    fetch('/api/meta/campaigns')
      .then(async res => {
          if (!res.ok) {
              let errorMessage = `Erreur de communication avec l'API Meta. Le token est probablement invalide, a expiré ou n'a pas les bonnes permissions (ads_read, leads_retrieval, pages_show_list, pages_read_engagement).`;
              try {
                  const errData = await res.json();
                  errorMessage = errData.details?.error?.message || errData.error || errorMessage;
              } catch(e) {
                  // Keep the generic error message if response is not JSON
              }
              throw new Error(errorMessage);
          }
          
          const data = await res.json();
           if(data.error) {
              const errorMessage = data.details?.error?.message || data.error || 'Erreur lors de la récupération des campagnes.';
              throw new Error(errorMessage);
          }

          setCampaigns(data.campaigns || []);
      })
      .catch(err => {
          setCampaignsError(err.message || 'Impossible de charger les campagnes. Vérifiez la connexion réseau.');
      })
      .finally(() => {
          setCampaignsLoading(false);
      });
  }

  // --- EFFECT TO FETCH CAMPAIGNS ---
  useEffect(() => {
    if (isConnected) {
        fetchCampaigns();
    } else {
        setCampaigns([]);
    }
  }, [isConnected]);


  const handleConnect = async () => {
    // IMPORTANT: This now reads the token from the environment variable.
    const userAccessToken = process.env.NEXT_PUBLIC_META_USER_ACCESS_TOKEN;
    
    if (!userAccessToken || userAccessToken === "REMPLACEZ_PAR_VOTRE_VRAI_JETON") {
      toast({
        variant: "destructive",
        title: "Action requise",
        description: "Veuillez ajouter votre jeton d'accès utilisateur Meta dans le fichier .env sous la clé NEXT_PUBLIC_META_USER_ACCESS_TOKEN.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const settingsCollection = collection(firestore, 'integrationSettings');
      await addDocumentNonBlocking(settingsCollection, {
        integrationName: 'meta',
        accessToken: userAccessToken,
        enabledCampaignIds: [],
        subscribedPageIds: []
      });
      toast({
        title: 'Connecté !',
        description: "L'intégration Meta a été activée.",
      });
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
  
  const handleSubscribePage = async (pageId: string) => {
    setSubscribingPageId(pageId);
    try {
      const response = await fetch('/api/meta/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: pageId }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `La requête a échoué avec le statut ${'' + response.status}.`);
      }

      toast({
        title: 'Abonnement Réussi!',
        description: `La page est maintenant abonnée aux prospects en temps réel.`,
      });
      
      // Re-fetch campaigns to update subscription status
      fetchCampaigns();

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: "Erreur d'abonnement",
        description: error.message,
      });
    } finally {
      setSubscribingPageId(null);
    }
  }

  const getCampaignsByPage = () => {
    return campaigns.reduce((acc, campaign) => {
      const pageName = campaign.account || "Page Inconnue";
      if (!acc[pageName]) {
        acc[pageName] = {
          pageId: campaign.page_id,
          campaigns: [],
          isSubscribed: campaign.subscribed,
        };
      }
      acc[pageName].campaigns.push(campaign);
      return acc;
    }, {} as Record<string, { pageId: string, campaigns: MetaCampaign[], isSubscribed: boolean }>);
  };
  
  const campaignsByPage = getCampaignsByPage();
  const isLoading = settingsLoading || campaignsLoading;

  return (
    <div className="space-y-8">
      {!isConnected ? (
         <Card>
            <CardHeader>
                <CardTitle>Étape 1 : Connecter votre compte Meta</CardTitle>
                <CardDescription>
                   Cliquez sur le bouton ci-dessous pour activer la synchronisation des leads. Assurez-vous d'avoir inséré votre jeton d'accès dans le fichier .env.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleConnect} disabled={isSaving}>
                    <Plug className="mr-2 h-4 w-4" /> 
                    {isSaving ? 'Connexion en cours...' : 'Se connecter à Meta'}
                </Button>
            </CardContent>
         </Card>
      ) : (
        <>
            <Alert variant="default" className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Étape 1 : Intégration Active</AlertTitle>
              <AlertDescription className="text-green-700">
                Vous êtes connecté à Meta. Le système est prêt à être configuré.
              </AlertDescription>
            </Alert>
            <Card>
                <CardHeader>
                    <CardTitle>Étape 2 : Activer le Temps Réel & Sélectionner les Campagnes</CardTitle>
                    <CardDescription>
                        Pour chaque page, activez la réception en temps réel puis cochez les campagnes à synchroniser. Les modifications sont enregistrées automatiquement.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   {isLoading ? (
                      <p className="text-sm text-muted-foreground text-center p-4">Chargement des campagnes...</p>
                    ) : campaignsError ? (
                      <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Erreur de chargement</AlertTitle>
                      <AlertDescription>
                        {campaignsError}
                        <Button variant="link" className="p-0 h-auto mt-2" onClick={handleDisconnect}>
                          Se déconnecter et réessayer ?
                        </Button>
                      </AlertDescription>
                      </Alert>
                  ) : Object.keys(campaignsByPage).length > 0 ? (
                    <div className="space-y-6">
                      {Object.entries(campaignsByPage).map(([pageName, data]) => (
                        <div key={data.pageId} className="rounded-lg border p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">{pageName}</h3>
                            {data.isSubscribed ? (
                               <Badge variant="secondary" className='border-green-500'>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                Temps Réel Activé
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={subscribingPageId === data.pageId}
                                onClick={() => handleSubscribePage(data.pageId)}
                              >
                                {subscribingPageId === data.pageId ? 
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                                  <BellRing className="mr-2 h-4 w-4" />
                                }
                                {subscribingPageId === data.pageId ? 'Activation...' : 'Activer le Temps Réel'}
                              </Button>
                            )}
                          </div>
                           <ScrollArea className="h-40 w-full">
                            <div className="space-y-2">
                            {data.campaigns.map(campaign => (
                                <div key={campaign.id} className="flex items-center space-x-2 py-1">
                                    <Checkbox
                                        id={`campaign-${campaign.id}`}
                                        checked={metaSettings.enabledCampaignIds?.includes(campaign.id)}
                                        onCheckedChange={() => handleCampaignToggle(campaign.id)}
                                    />
                                    <Label htmlFor={`campaign-${campaign.id}`} className="font-normal flex flex-col">
                                        <span>{campaign.name}</span>
                                        <span className="text-xs text-muted-foreground">ID: {campaign.id}</span>
                                    </Label>
                                </div>
                            ))}
                            </div>
                          </ScrollArea>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center p-4">Aucune campagne active trouvée. Assurez-vous que votre token est valide et dispose des bonnes permissions.</p>
                  )}
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
  );
}
