'use client';
import { MetaSettings } from './_components/meta-settings';

export default function SettingsPage() {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Intégration Meta</h1>
      </div>
      <p className="text-muted-foreground">
        Connectez votre compte Meta pour synchroniser automatiquement les leads de vos campagnes publicitaires.
      </p>

      <div className="mt-6">
        <MetaSettings />
      </div>
    </>
  );
}