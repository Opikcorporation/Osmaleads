'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import type { Lead, IntegrationSetting } from '@/lib/types';
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
 * Handles incoming lead data from Meta.
 * Meta sends a POST request to this endpoint whenever a new lead is generated.
 */
export async function POST(request: Request) {
  const { firestore } = getFirebaseAdmin();
  
  try {
    const body = await request.json();

    // Meta sends data in an 'entry' array. We process each entry.
    if (body.object === 'page' && body.entry) {
      
        for (const entry of body.entry) {
            for (const change of entry.changes) {
                if (change.field === 'leadgen' || change.field === 'leads') {
                    const leadgenValue = change.value;
                    const leadData : {[key:string]: string} = {};
                    
                    // Handle standard Meta 'leadgen' format
                    if (leadgenValue.field_data) {
                        leadgenValue.field_data.forEach((field: {name: string, values: string[]}) => {
                            leadData[field.name] = field.values[0];
                        });
                    } 
                    // Handle flat structure from Zapier
                    else {
                         Object.keys(leadgenValue).forEach(key => {
                            // Exclude Meta's internal fields if they exist
                            if (!key.startsWith('ad_') && !key.startsWith('form_') && !key.startsWith('campaign_') && key !== 'created_time') {
                               leadData[key] = leadgenValue[key];
                            }
                        });
                    }

                    const leadDataString = JSON.stringify(leadData);

                    // --- QUALIFICATION ---
                    const qualification = await qualifyLead({ leadData: leadDataString });

                    const newLead: Omit<Lead, 'id'> = {
                        name: leadData.nom || 'Nom Inconnu',
                        email: leadData.email || null,
                        phone: leadData.telephone || null,
                        company: leadData.company || null,
                        username: null,
                        status: 'New',
                        leadData: leadDataString,
                        assignedCollaboratorId: null,
                        createdAt: FieldValue.serverTimestamp(),
                        campaignId: leadgenValue.campaign_id || null,
                        campaignName: leadData.nom_campagne || leadgenValue.campaign_name || null,
                        score: qualification.score,
                        tier: qualification.tier
                    };

                    // Add the new lead to our Firestore 'leads' collection.
                    await firestore.collection('leads').add(newLead);
                }
            }
        }
        
        console.log("Successfully processed leads from Meta webhook.");
        return NextResponse.json({ message: 'Lead received' }, { status: 200 });
    }

    // If the data format is not what we expect
    return NextResponse.json({ message: 'Unsupported event type' }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing Meta webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
