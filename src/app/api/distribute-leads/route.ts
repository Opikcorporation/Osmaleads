'use server';

import { NextResponse } from 'next/server';
import { distributeLeads } from '@/ai/flows/distribute-leads-flow';

/**
 * API route to trigger the intelligent lead distribution flow.
 * This endpoint is designed to be called by a secure, automated service (e.g., a cron job).
 *
 * Security:
 * It expects an 'Authorization' header with a Bearer token.
 * `Authorization: Bearer YOUR_CRON_SECRET_KEY`
 * The `YOUR_CRON_SECRET_KEY` must match the `CRON_SECRET_KEY` environment variable.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET_KEY;

  // Security Check: Ensure a secret key is provided and it matches the environment variable.
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await distributeLeads({});
    return NextResponse.json({
      message: 'Lead distribution process completed.',
      distributedCount: result.distributedCount,
    });
  } catch (error: any) {
    console.error('API Error: Failed to run lead distribution flow.', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

// Handler for GET requests to provide a simple confirmation that the route exists.
export async function GET() {
  return NextResponse.json({ message: 'Lead distribution API is active. Use POST to trigger.' });
}
