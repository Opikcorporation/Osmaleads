'use client';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { collection, doc } from 'firebase/firestore';
import type { Group, DistributionSetting, LeadTier } from '@/lib/types';
import { leadTiers } from '@/lib/types';
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [dailyQuota, setDailyQuota] = useState(5);
  const [leadTier, setLeadTier] = useState<LeadTier | 'Tous'>('Tous');

  const groupsQuery = useMemoFirebase(
    () => collection(firestore, 'groups'),
    [firestore]
  );
  const settingsQuery = useMemoFirebase(
    () => collection(firestore, 'distributionSettings'),
    [firestore]
  );

  const { data: groups, isLoading: groupsLoading } = useCollection<Group>(groupsQuery);
  const { data: settings, isLoading: settingsLoading } = useCollection<DistributionSetting>(settingsQuery);

  // When selected group changes, update the form with its existing settings
  useEffect(() => {
    if (selectedGroupId) {
      const existingSetting = settings?.find(s => s.groupId === selectedGroupId);
      if (existingSetting) {
        setDailyQuota(existingSetting.dailyQuota);
        setLeadTier(existingSetting.leadTier);
      } else {
        // Reset to default if new group is selected that has no setting yet
        setDailyQuota(5);
        setLeadTier('Tous');
      }
    }
  }, [selectedGroupId, settings]);

  const handleSaveRule = () => {
    if (!selectedGroupId) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner un groupe.' });
      return;
    }

    const existingSetting = settings?.find(s => s.groupId === selectedGroupId);

    const ruleData = {
      groupId: selectedGroupId,
      dailyQuota,
      leadTier,
    };

    if (existingSetting) {
      const settingRef = doc(firestore, 'distributionSettings', existingSetting.id);
      updateDocumentNonBlocking(settingRef, ruleData);
      toast({ title: 'Règle mise à jour', description: `La règle pour ce groupe a été modifiée.` });
    } else {
      const settingsColRef = collection(firestore, 'distributionSettings');
      addDocumentNonBlocking(settingsColRef, ruleData);
      toast({ title: 'Règle créée', description: `La règle de distribution a été ajoutée.` });
    }
  };
  
  const handleDeleteRule = (settingId: string) => {
    const settingRef = doc(firestore, 'distributionSettings', settingId);
    deleteDocumentNonBlocking(settingRef);
    toast({ variant: 'destructive', title: 'Règle supprimée', description: 'La règle a été supprimée.' });
  }

  const getGroupName = (groupId: string) => {
    return groups?.find(g => g.id === groupId)?.name || 'Groupe inconnu';
  }

  if (groupsLoading || settingsLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Règles de Distribution</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configurer une Règle</CardTitle>
            <CardDescription>
              Définissez quel type de lead chaque groupe reçoit et leur quota journalier.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="group-select">Groupe</Label>
              <Select onValueChange={setSelectedGroupId} value={selectedGroupId}>
                <SelectTrigger id="group-select">
                  <SelectValue placeholder="Sélectionner un groupe" />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map(group => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-tier">Tier de Lead Ciblé</Label>
              <Select onValueChange={(value) => setLeadTier(value as any)} value={leadTier}>
                <SelectTrigger id="lead-tier">
                  <SelectValue placeholder="Sélectionner un tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tous">Tous les Tiers</SelectItem>
                  {leadTiers.map(tier => (
                    <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quota">Quota de leads par jour</Label>
              <Input id="quota" type="number" value={dailyQuota} onChange={(e) => setDailyQuota(Number(e.target.value))} placeholder="e.g., 5" />
            </div>
            
            <Button onClick={handleSaveRule} disabled={!selectedGroupId}>Enregistrer la Règle</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Règles Actives
            </CardTitle>
            <CardDescription>
              Aperçu des règles de distribution actuellement configurées.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings && settings.length > 0 ? (
                settings.map(setting => (
                    <div key={setting.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                            <p className="font-semibold">{getGroupName(setting.groupId)}</p>
                            <p className="text-sm text-muted-foreground">
                                Cible : <span className="font-bold text-primary">{setting.leadTier}</span> (Max {setting.dailyQuota}/jour)
                            </p>
                        </div>
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteRule(setting.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Supprimer</span>
                        </Button>
                    </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground text-center">Aucune règle de distribution configurée.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

    