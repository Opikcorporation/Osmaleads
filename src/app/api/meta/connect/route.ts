'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { IntegrationSetting } from '@/lib/types';
import fetch from 'node-fetch';

const RequestBodySchema = z.object({
  accessToken: z.string().min(1, "Le jeton d'accès est requis."),
});

/**
 * API route to connect to Meta.
 * It validates the access token and saves it securely in Firestore.
 */
export async function POST(request: Request) {
  const { firestore } = getFirebaseAdmin();
  
  try {
    const body = await request.json();
    const validation = RequestBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.formErrors }, { status: 400 });
    }
    
    const { accessToken } = validation.data;

    // --- Validate token by making a simple API call ---
    // This ensures the token is not completely fake before saving it.
    const validationUrl = `https://graph.facebook.com/v19.0/me?access_token=${accessToken}`;
    const validationResponse = await fetch(validationUrl);
    if (!validationResponse.ok) {
        const errorData = await validationResponse.json();
        const errorMessage = errorData?.error?.message || "Le jeton d'accès fourni est invalide ou a expiré.";
        return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    // --- Save or update the settings in Firestore ---
    const settingsCollection = firestore.collection('integrationSettings');
    const settingsQuery = await settingsCollection.where('integrationName', '==', 'meta').limit(1).get();

    const newSettings: Omit<IntegrationSetting, 'id'> = {
      integrationName: 'meta',
      accessToken: accessToken,
      enabledCampaignIds: [],
      subscribedPageIds: []
    };

    if (settingsQuery.empty) {
      // No settings exist, create a new document
      await settingsCollection.add(newSettings);
    } else {
      // Settings exist, update the existing document
      const docRef = settingsQuery.docs[0].ref;
      await docRef.update({
        accessToken: accessToken,
        // Reset enabled campaigns and subscriptions on new token to force re-selection
        enabledCampaignIds: [], 
        subscribedPageIds: []
      });
    }

    return NextResponse.json({ success: true, message: 'Connexion à Meta réussie.' }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/meta/connect:', error);
    return NextResponse.json({ error: 'Failed to execute connection', details: error.message }, { status: 500 });
  }
}
