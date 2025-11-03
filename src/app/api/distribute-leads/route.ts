
import {NextRequest, NextResponse} from 'next/server';
import {distributeLeads} from '@/ai/flows/distribute-leads-flow';

export async function GET(request: NextRequest) {
  // --- Sécurité ---
  // On vérifie que la requête vient bien de Cloud Scheduler ou d'une source autorisée.
  const cronHeader = request.headers.get('X-Appengine-Cron');
  const authHeader = request.headers.get('Authorization');
  const jobSecret = process.env.DISTRIBUTION_JOB_SECRET;

  // Cloud Scheduler ajoute ce header. En production, c'est la meilleure vérification.
  if (process.env.NODE_ENV === 'production' && !cronHeader) {
     return new NextResponse('Unauthorized: Missing X-Appengine-Cron header', { status: 401 });
  }

  // Pour le développement ou les tests manuels, on utilise une clé secrète.
  if (process.env.NODE_ENV !== 'production' && (!authHeader || authHeader !== `Bearer ${jobSecret}`)) {
     return new NextResponse('Unauthorized: Invalid or missing secret', { status: 401 });
  }
  
  console.log("Distribution de leads intelligente déclenchée par l'API...");

  try {
    const result = await distributeLeads({});
    console.log(`Distribution terminée. ${result.distributedCount} leads ont été assignés.`);
    return NextResponse.json({
      message: 'Distribution de leads terminée avec succès.',
      distributedCount: result.distributedCount,
    });
  } catch (error) {
    console.error("Erreur lors de la distribution intelligente via l'API:", error);
    return new NextResponse('Erreur interne du serveur lors de la distribution.', {status: 500});
  }
}
