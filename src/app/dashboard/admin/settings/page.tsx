'use client';
import { IntegrationStatus } from './_components/integration-status';

export default function SettingsPage() {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold md:text-3xl">Statut de l'Intégration</h1>
      </div>
      <p className="text-sm text-muted-foreground md:text-base">
        Vérifiez l'état de votre intégration (Zapier) et consultez les campagnes qui envoient des leads.
      </p>

      <div className="mt-6">
        <IntegrationStatus />
      </div>
    </>
  );
}
