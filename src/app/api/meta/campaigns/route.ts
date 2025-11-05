
'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { IntegrationSetting } from '@/lib/types';
import { NextResponse } from 'next/server';
import fetch from 'node-fetch';

const META_GRAPH_API_URL = 'https://graph.facebook.com/v19.0';

/**
 * API route to fetch advertising campaigns from Meta.
 * It uses the access token stored in the integration settings.
 */
export async function GET(request: Request) {
  const { firestore } = getFirebaseAdmin();
  
  try {
    // 1. Fetch the Meta integration settings from Firestore.
    const settingsSnap = await firestore.collection('integrationSettings').where('integrationName', '==', 'meta').limit(1).get();

    if (settingsSnap.empty) {
      return NextResponse.json({ error: 'Meta integration not configured.' }, { status: 404 });
    }
    
    const metaSettings = settingsSnap.docs[0].data() as IntegrationSetting;
    const accessToken = metaSettings.accessToken;

    if (!accessToken) {
        return NextResponse.json({ error: 'Meta access token is missing.' }, { status: 400 });
    }

    // 2. Fetch the "ad accounts" associated with the access token.
    const adAccountsResponse = await fetch(`${META_GRAPH_API_URL}/me/adaccounts?fields=name,account_id&access_token=${accessToken}`);
    if (!adAccountsResponse.ok) {
        const errorData = await adAccountsResponse.json();
        console.error("Failed to fetch Meta ad accounts:", errorData);
        return NextResponse.json({ error: 'Failed to fetch ad accounts from Meta.', details: errorData }, { status: adAccountsResponse.status });
    }
    const adAccountsData = await adAccountsResponse.json() as any;

    if (!adAccountsData.data || adAccountsData.data.length === 0) {
        return NextResponse.json({ campaigns: [] }); // No ad accounts found
    }

    // 3. For each ad account, fetch its campaigns.
    const allCampaigns: { id: string; name: string; account: string }[] = [];
    
    for (const account of adAccountsData.data) {
        const campaignsResponse = await fetch(`${META_GRAPH_API_URL}/${account.id}/campaigns?fields=name,effective_status&access_token=${accessToken}`);
        if (!campaignsResponse.ok) {
            console.warn(`Could not fetch campaigns for account ${account.name}. Skipping.`);
            continue; // Skip this account if there's an error
        }
        const campaignsData = await campaignsResponse.json() as any;
        
        if (campaignsData.data) {
            const activeCampaigns = campaignsData.data
                .filter((c: any) => c.effective_status === 'ACTIVE')
                .map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    account: account.name
                }));
            allCampaigns.push(...activeCampaigns);
        }
    }

    // 4. Return the combined list of active campaigns.
    return NextResponse.json({ campaigns: allCampaigns });

  } catch (error: any) {
    console.error('Error in /api/meta/campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns', details: error.message }, { status: 500 });
  }
}
