
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { Lead } from '@/lib/types';
import { scoreLead } from '@/ai/flows/score-lead-flow';
import { writeBatch } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const { leadIds } = await req.json();

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array is required' }, { status: 400 });
    }
    
    const { firestore } = getFirebaseAdmin();
    
    // 1. Fetch all leads in parallel
    const leadRefs = leadIds.map(id => firestore.collection('leads').doc(id));
    const leadSnaps = await firestore.getAll(...leadRefs);
    
    const leadsToScore = leadSnaps
      .map(snap => ({ ...snap.data(), id: snap.id } as Lead))
      .filter(lead => lead.leadData); // Ensure leadData exists

    if (leadsToScore.length === 0) {
      return NextResponse.json({ success: true, message: "No leads found to score." });
    }

    // 2. Call the batch AI flow
    const scoringResults = await scoreLead({ leads: leadsToScore });
    
    // 3. Batch write all scores to Firestore
    if (scoringResults.scores && scoringResults.scores.length > 0) {
        const batch = writeBatch(firestore);
        scoringResults.scores.forEach(result => {
            const leadRef = firestore.collection('leads').doc(result.leadId);
            batch.update(leadRef, { score: result.score });
        });
        await batch.commit();
    }

    return NextResponse.json({ success: true, scoredCount: scoringResults.scores.length });
  } catch (error: any) {
    console.error('Error in /api/score-lead:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred' }, { status: 500 });
  }
}
