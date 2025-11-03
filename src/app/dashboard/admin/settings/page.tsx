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
import { Bot, Trash2 } from "lucide-react";
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/firebase";
import { collection, doc, where, query } from 'firebase/firestore';
import type { Group, DistributionSetting } from '@/lib/types';
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [leadsPerDay, setLeadsPerDay] = useState(5);
  const [distributionTime, setDistributionTime] = useState("17:00");

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

  const handleSaveRule = () => {
    if (!selectedGroupId) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner un groupe.' });
      return;
    }

    const existingSetting = settings?.find(s => s.groupId === selectedGroupId);

    const ruleData = {
      groupId: selectedGroupId,
      leadsPerDay,
      distributionTime,
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
        <h1 className="text-2xl font-semibold md:text-3xl">Paramètres de Distribution</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Règles de Distribution par Groupe</CardTitle>
            <CardDescription>
              Configurez des règles de distribution automatique pour chaque groupe.
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
              <Label htmlFor="quota">Leads par jour</Label>
              <Input id="quota" type="number" value={leadsPerDay} onChange={(e) => setLeadsPerDay(Number(e.target.value))} placeholder="e.g., 5" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="distribution-time">Heure de distribution</Label>
                <Input id="distribution-time" type="time" value={distributionTime} onChange={(e) => setDistributionTime(e.target.value)} />
                <p className="text-xs text-muted-foreground">Les leads seront distribués à cette heure chaque jour.</p>
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
                            <p className="text-sm text-muted-foreground">{setting.leadsPerDay} leads/jour à {setting.distributionTime}</p>
                        </div>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteRule(setting.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground text-center">Aucune règle de distribution configurée.</p>
            )}
          </CardContent>
        </Card>
      </div>
      
       <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="text-accent" /> Stratégie IA
            </CardTitle>
            <CardDescription>
              Utilisez l'IA pour suggérer la meilleure stratégie de distribution pour les leads non assignés.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Notre IA peut analyser les leads non assignés et la performance de votre équipe pour suggérer le collaborateur optimal pour chaque lead, maximisant votre potentiel de conversion.
            </p>
            <Button className="w-full bg-accent hover:bg-accent/90">
              <Bot className="mr-2 h-4 w-4" />
              Suggérer & Distribuer Maintenant
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Ceci lancera la stratégie IA sur tous les leads actuellement non assignés.
            </p>
          </CardContent>
        </Card>
    </>
  );
}
