
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { Lead } from '@/lib/types';
import { scoreLead } from '@/ai/flows/score-lead-flow';

export async function POST(req: NextRequest) {
  try {
    const { leadId } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }
    
    const { firestore } = getFirebaseAdmin();
    const leadRef = firestore.collection('leads').doc(leadId);
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const leadData = leadSnap.data() as Lead;
    
    // Call the AI flow to get the score
    const result = await scoreLead({ leadData: leadData.leadData });
    const score = result.score;
    
    // Update the lead document with the new score
    await leadRef.update({ 
        score: score,
    });

    return NextResponse.json({ success: true, leadId, score });
  } catch (error: any) {
    console.error('Error in /api/score-lead:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred' }, { status: 500 });
  }
}
