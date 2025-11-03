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
import { collection, doc, where, query, getDocs, writeBatch } from 'firebase/firestore';
import type { Group, DistributionSetting, Lead } from '@/lib/types';
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { suggestRedistributionStrategy } from "@/ai/flows/suggest-redistribution-strategy";


export default function AdminSettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>();
  const [leadsPerDay, setLeadsPerDay] = useState(5);
  const [distributionTime, setDistributionTime] = useState("17:00");
  const [isDistributing, setIsDistributing] = useState(false);

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

  const handleManualDistribution = async () => {
    setIsDistributing(true);
    toast({ title: "Lancement de la distribution...", description: "Recherche des leads non assignés." });

    try {
      // 1. Fetch all necessary data
      const unassignedLeadsQuery = query(collection(firestore, 'leads'), where('assignedCollaboratorId', '==', null));
      const unassignedLeadsSnap = await getDocs(unassignedLeadsQuery);
      const unassignedLeads = unassignedLeadsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Lead[];

      if (unassignedLeads.length === 0) {
        toast({ title: "Aucun lead à distribuer", description: "Tous les leads sont déjà assignés." });
        setIsDistributing(false);
        return;
      }
      
      const distributionSettings = settings || [];
      const allGroups = groups || [];

      let leadsToDistribute = [...unassignedLeads];
      let distributedCount = 0;
      
      const batch = writeBatch(firestore);

      // Simple round-robin distribution logic
      for (const setting of distributionSettings) {
        const group = allGroups.find(g => g.id === setting.groupId);
        if (!group || group.collaboratorIds.length === 0) continue;

        const leadsForThisGroup = leadsToDistribute.splice(0, setting.leadsPerDay);
        if (leadsForThisGroup.length === 0) continue;

        let collaboratorIndex = 0;
        for (const lead of leadsForThisGroup) {
          const assignedCollaboratorId = group.collaboratorIds[collaboratorIndex % group.collaboratorIds.length];
          const leadRef = doc(firestore, 'leads', lead.id);
          batch.update(leadRef, { assignedCollaboratorId: assignedCollaboratorId });
          
          collaboratorIndex++;
          distributedCount++;
        }
      }

      if (distributedCount > 0) {
        await batch.commit();
        toast({ title: "Distribution terminée", description: `${distributedCount} leads ont été distribués.` });
      } else {
        toast({ title: "Distribution terminée", description: "Aucun lead n'a été distribué. Vérifiez vos règles." });
      }

    } catch (error) {
      console.error("Distribution error:", error);
      toast({ variant: "destructive", title: "Erreur de distribution", description: "Une erreur s'est produite." });
    }

    setIsDistributing(false);
  };


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
              <Bot className="text-accent" /> Distribution Manuelle
            </CardTitle>
            <CardDescription>
              Lancez la distribution des leads non assignés en fonction des règles actives.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Cette action appliquera les règles de distribution à tous les leads actuellement non assignés.
            </p>
            <Button onClick={handleManualDistribution} disabled={isDistributing} className="w-full bg-accent hover:bg-accent/90">
              <Bot className="mr-2 h-4 w-4" />
              {isDistributing ? 'Distribution en cours...' : 'Lancer la Distribution Manuelle'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Ceci est une action manuelle.
            </p>
          </CardContent>
        </Card>
    </>
  );
}
