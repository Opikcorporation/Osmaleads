
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { generateLeadProfile } from '@/ai/flows/generate-lead-profile';
import type { Lead } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { leadId } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const { firestore } = getFirebaseAdmin();
    const leadRef = firestore.collection('leads').doc(leadId);
    const leadDoc = await leadRef.get();

    if (!leadDoc.exists) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const leadData = leadDoc.data() as Lead;

    // Call the AI flow with the raw lead data
    const structuredProfile = await generateLeadProfile({ leadData: leadData.leadData });
    
    // Create an update object with the data returned from the AI
    // Fallback to existing name if AI fails to provide one
    const updateData = {
        name: structuredProfile.name || leadData.name,
        company: structuredProfile.company || null,
        email: structuredProfile.email || null,
        phone: structuredProfile.phone || null,
        username: structuredProfile.username || null,
        status: 'New', // Set status to 'New' after analysis
    };

    // Update the lead document in Firestore with the structured data
    await leadRef.update(updateData);

    return NextResponse.json({ success: true, leadId: leadId, profile: updateData });
  } catch (error: any) {
    console.error('Error in generate-lead-profile API route:', error);
    // If AI fails, update status to 'New' anyway to unblock it
    const { leadId } = await req.json();
    if(leadId) {
        const { firestore } = getFirebaseAdmin();
        const leadRef = firestore.collection('leads').doc(leadId);
        await leadRef.update({ status: 'New' }).catch(e => console.error("Failed to update status on error:", e));
    }
    return NextResponse.json({ error: error.message || 'An internal server error occurred' }, { status: 500 });
  }
}
