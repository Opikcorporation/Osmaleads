'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // La page racine redirige de manière inconditionnelle vers la page de connexion.
    // C'est la page de connexion qui décidera ensuite s'il faut rediriger vers le dashboard.
    router.replace('/login');
  }, [router]);

  // Affiche un état de chargement pendant que la redirection s'effectue.
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <p className="text-xl font-bold animate-pulse">Osmaleads</p>
        <p className="font-semibold">Chargement de l'application...</p>
      </div>
    </div>
  );
}
