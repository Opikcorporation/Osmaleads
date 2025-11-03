'use client';

export default function DashboardPage() {

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl">Dashboard</h1>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
        <div className="flex flex-col items-center gap-1 text-center">
          <h3 className="text-2xl font-bold tracking-tight">
            Bienvenue sur votre tableau de bord.
          </h3>
          <p className="text-sm text-muted-foreground">
            Le chargement des données a été temporairement désactivé pour assurer l'accès.
          </p>
        </div>
      </div>
    </>
  );
}
