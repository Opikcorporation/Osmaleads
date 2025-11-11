'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import type { Lead } from '@/lib/types';
import { qualifyLead } from '@/ai/flows/qualify-lead-flow';

// This is a secret token that we will configure in Meta's Developer Dashboard.
// It ensures that the requests are coming from Meta and not from a malicious third party.
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

/**
 * Handles the webhook verification request from Meta.
 * Meta sends a GET request to this endpoint with a challenge token.
 * We must respond with that same token to prove ownership of the webhook URL.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Check if it's a subscription verification request and if the token matches.
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    // Respond with the challenge token from the request
    console.log('Meta webhook verified successfully!');
    return new Response(challenge, { status: 200 });
  } else {
    // If it's not a valid verification request, respond with a 403 Forbidden error.
    console.warn('Failed webhook verification. Make sure the verify token is set correctly.');
    return new Response('Forbidden', { status: 403 });
  }
}

/**
 * Handles incoming lead data from Meta/Zapier.
 */
export async function POST(request: Request) {
  const { firestore } = getFirebaseAdmin();
  
  try {
    const body = await request.json();

    // Zapier might send a single lead object, while Meta sends an array in `entry`.
    // We'll handle both cases.
    const leadsToProcess = Array.isArray(body) ? body : [body];

    for (const leadPayload of leadsToProcess) {
      // The actual lead data might be nested inside `entry` for direct Meta webhooks
      const changes = leadPayload.entry?.[0]?.changes;
      // Use the raw payload from Zapier, or dig into the Meta structure if it exists.
      const leadgenValue = changes?.[0]?.value || leadPayload;

      // Extract all key-value pairs from the webhook payload into a clean object.
      // This ensures all relevant data is captured in a consistent format.
      const data: Record<string, string | null> = {
          nom: leadgenValue.nom || null,
          email: leadgenValue.email || null,
          telephone: leadgenValue.telephone || null,
          nom_campagne: leadgenValue.nom_campagne || null,
          objectif: leadgenValue.objectif || null,
          budget: leadgenValue.budget || null,
          temps: leadgenValue.temps || null,
          type_de_bien: leadgenValue.type_de_bien || null,
          created_time: leadgenValue['created_time'] || leadgenValue['Create Time'] || null
      };

      const leadDataString = JSON.stringify(data);

      // --- QUALIFICATION (Temporarily disabled) ---
      const qualification = await qualifyLead({ leadData: leadDataString });

      // --- DATE HANDLING ---
      let createdAt: FieldValue | Timestamp;
      const dateString = data['created_time'];
      if (dateString) {
        // Meta sends date strings like "2024-05-21T10:30:00+0000"
        const date = new Date(dateString);
        // Check if the date is valid before creating a Timestamp
        if (!isNaN(date.getTime())) {
          createdAt = Timestamp.fromDate(date);
        } else {
          // Fallback to server time if the date is invalid
          createdAt = FieldValue.serverTimestamp();
        }
      } else {
        createdAt = FieldValue.serverTimestamp();
      }

      const newLead: Omit<Lead, 'id'> = {
          name: data.nom || 'Nom Inconnu',
          email: data.email || null,
          phone: data.telephone || null,
          company: null, // No company field from this source
          username: null,
          status: 'New', // Automatically set status to 'New'
          leadData: leadDataString,
          assignedCollaboratorId: null,
          createdAt: createdAt as Timestamp, // We cast it here for type consistency
          campaignId: leadgenValue.campaign_id || null,
          campaignName: data.nom_campagne || null,
          score: qualification.score,
          tier: qualification.tier,
      };

      // Add the new lead to our Firestore 'leads' collection.
      await firestore.collection('leads').add(newLead);
    }
        
    console.log(`Successfully processed ${leadsToProcess.length} lead(s).`);
    return NextResponse.json({ message: 'Lead(s) received' }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
