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
      const rawData = changes?.[0]?.value || leadPayload;

      // --- DATA STANDARDIZATION ---
      // This maps all possible field names from your Zaps to a single, consistent structure.
      const standardizedData = {
          name: rawData.nom || rawData['FULL NAME'] || 'Nom Inconnu',
          email: rawData.email || rawData['EMAIL'] || null,
          phone: rawData.telephone || rawData['PHONE'] || null,
          zapName: rawData.form_name || rawData.zap_name || rawData['Form Name'] || 'Inconnu', // Use zap name now
          intention: rawData.temps || rawData['Votre Intention Dachat'] || null,
          budget: rawData.budget || rawData['Quel Est Votre Budget'] || null,
          objectif: rawData.objectif || null, // Only exists in one form
          typeDeBien: rawData.type_de_bien || rawData['Vous Recherchez'] || null,
          createdTime: rawData.created_time || rawData['Created Time'] || null,
      };

      const leadDataString = JSON.stringify(rawData);
      
      // --- DATE HANDLING ---
      let createdAt: FieldValue | Timestamp;
      if (standardizedData.createdTime) {
        const date = new Date(standardizedData.createdTime);
        if (!isNaN(date.getTime())) {
          createdAt = Timestamp.fromDate(date);
        } else {
          createdAt = FieldValue.serverTimestamp();
        }
      } else {
        createdAt = FieldValue.serverTimestamp();
      }

      // --- CREATE FINAL LEAD OBJECT ---
      // We now use our standardized fields.
      const newLead: Omit<Lead, 'id'> = {
          name: standardizedData.name,
          email: standardizedData.email,
          phone: standardizedData.phone,
          zapName: standardizedData.zapName, // Use the extracted zapName
          status: 'New',
          leadData: leadDataString,
          createdAt: createdAt as Timestamp,
          assignedCollaboratorId: null,
          // Set default score and tier. Qualification will happen via the admin panel.
          score: 0,
          tier: 'Bas de gamme',
          // Store the other important fields at the top level for easy access
          intention: standardizedData.intention,
          budget: standardizedData.budget,
          objectif: standardizedData.objectif,
          typeDeBien: standardizedData.typeDeBien,
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
