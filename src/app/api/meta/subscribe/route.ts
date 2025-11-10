'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { IntegrationSetting } from '@/lib/types';
import { NextResponse } from 'next/server';
import fetch from 'node-fetch';
import { z } from 'zod';

const META_GRAPH_API_URL = 'https://graph.facebook.com/v19.0';

const RequestBodySchema = z.object({
  pageId: z.string().min(1, "L'ID de la page est requis."),
});

/**
 * API route to subscribe a Facebook Page to the 'leadgen' webhook topic.
 * This tells Meta to send new leads from that page to our webhook URL.
 */
export async function POST(request: Request) {
  const { firestore } = getFirebaseAdmin();
  
  try {
    // 1. --- Validate Input ---
    const body = await request.json();
    const validation = RequestBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.formErrors }, { status: 400 });
    }
    const { pageId } = validation.data;

    // 2. --- Get Stored Meta Access Token ---
    const settingsSnap = await firestore.collection('integrationSettings').where('integrationName', '==', 'meta').limit(1).get();
    if (settingsSnap.empty) {
      return NextResponse.json({ error: 'Meta integration not configured.' }, { status: 404 });
    }
    const metaSettings = settingsSnap.docs[0].data() as IntegrationSetting;
    const userAccessToken = metaSettings.accessToken;
    if (!userAccessToken) {
        return NextResponse.json({ error: 'Meta access token is missing.' }, { status: 400 });
    }

    // 3. --- Get Page-Specific Access Token ---
    // This is crucial. We need to use the page's own token for the subscription.
    const pageTokenResponse = await fetch(`${META_GRAPH_API_URL}/${pageId}?fields=access_token&access_token=${userAccessToken}`);
    if (!pageTokenResponse.ok) {
        return NextResponse.json({ error: `Impossible d'obtenir le jeton pour la page ${pageId}.` }, { status: 403 });
    }
    const pageData = await pageTokenResponse.json() as { access_token: string };
    const pageAccessToken = pageData.access_token;


    // 4. --- Subscribe Page to Webhook ---
    const subscribeUrl = `${META_GRAPH_API_URL}/${pageId}/subscribed_apps`;
    const response = await fetch(subscribeUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            subscribed_fields: ['leadgen'],
            access_token: pageAccessToken
        })
    });
    
    const responseData = await response.json();

    if (!response.ok) {
      console.error("Meta subscription failed:", responseData);
      const errorMessage = responseData.error?.message || "Une erreur est survenue lors de l'abonnement.";
      return NextResponse.json({ error: `Échec de l'abonnement de la page: ${errorMessage}` }, { status: 500 });
    }

    // 5. --- (Optional but Recommended) Store subscription status in Firestore ---
    // This helps the UI know the page is subscribed without asking Meta every time.
    // We can add a 'subscribedPageIds' array to the settings document.
    const settingsDocRef = settingsSnap.docs[0].ref;
    const currentSubscribed = metaSettings.subscribedPageIds || [];
    if (!currentSubscribed.includes(pageId)) {
        await settingsDocRef.update({
            subscribedPageIds: [...currentSubscribed, pageId]
        });
    }

    return NextResponse.json({ success: true, message: `Page ${pageId} abonnée avec succès.` }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/meta/subscribe:', error);
    return NextResponse.json({ error: 'Failed to execute subscription', details: error.message }, { status: 500 });
  }
}
