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
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

// Placeholder state
const isConnected = false; // In a real app, this would come from a hook or global state.

export function MetaSettings() {
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    setLoading(true);
    // Placeholder for actual connection logic
    setTimeout(() => {
      alert('This is a placeholder for the Meta connection flow.');
      setLoading(false);
    }, 1000);
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
        {/* Connection Status Section */}
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
                {isConnected ? 'Connecté' : 'Non connecté'}
              </p>
            </div>
          </div>
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Actif' : 'Inactif'}
          </Badge>
        </div>

        <Separator />

        {/* Campaign Configuration Section */}
        <div>
          <h3 className="text-lg font-semibold">
            Configuration des Campagnes
          </h3>
          <p className="text-sm text-muted-foreground">
            Sélectionnez les campagnes dont vous souhaitez importer les leads.
          </p>
          <div className="mt-4 rounded-lg border bg-muted/50 p-6 text-center">
            {isConnected ? (
              <p className="text-sm">
                Chargement de la liste des campagnes...
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Veuillez d'abord connecter votre compte Meta pour voir vos
                campagnes.
              </p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        {isConnected ? (
          <Button variant="destructive">Se déconnecter de Meta</Button>
        ) : (
          <Button onClick={handleConnect} disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter à Meta'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
