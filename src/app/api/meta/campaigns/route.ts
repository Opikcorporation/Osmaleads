
'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { IntegrationSetting } from '@/lib/types';
import { NextResponse } from 'next/server';
import fetch from 'node-fetch';

const META_GRAPH_API_URL = 'https://graph.facebook.com/v19.0';

type MetaCampaign = {
    id: string;
    name: string;
    account: string;
};

type AdAccount = {
    id: string;
    name: string;
    account_id: string;
};


/**
 * Fetches campaigns for a given ad account ID.
 */
async function fetchCampaignsForAccount(accountId: string, accountName: string, accessToken: string): Promise<MetaCampaign[]> {
    const campaignsResponse = await fetch(`${META_GRAPH_API_URL}/${accountId}/campaigns?fields=name,effective_status&access_token=${accessToken}`);
    if (!campaignsResponse.ok) {
        console.warn(`Could not fetch campaigns for account ${accountName} (${accountId}). Skipping.`);
        return [];
    }
    const campaignsData = await campaignsResponse.json() as any;
    
    if (campaignsData.data) {
        return campaignsData.data
            .filter((c: any) => c.effective_status === 'ACTIVE')
            .map((c: any) => ({
                id: c.id,
                name: c.name,
                account: accountName
            }));
    }
    return [];
}


/**
 * API route to fetch advertising campaigns from Meta.
 * It uses the access token stored in the integration settings.
 * This version is more robust, first trying to find accounts via Business Manager,
 * then falling back to direct ad accounts.
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

    const allAdAccounts: AdAccount[] = [];
    let fetchError: any = null;

    // --- STRATEGY 1: Fetch via Business Manager ---
    try {
        const businessesResponse = await fetch(`${META_GRAPH_API_URL}/me/businesses?access_token=${accessToken}`);
        if (businessesResponse.ok) {
            const businessesData = await businessesResponse.json() as any;
            if (businessesData.data && businessesData.data.length > 0) {
                 for (const business of businessesData.data) {
                    const ownedAdAccountsResponse = await fetch(`${META_GRAPH_API_URL}/${business.id}/owned_ad_accounts?fields=name,account_id&access_token=${accessToken}`);
                    if(ownedAdAccountsResponse.ok) {
                        const adAccountsData = await ownedAdAccountsResponse.json() as any;
                        if(adAccountsData.data) {
                            allAdAccounts.push(...adAccountsData.data);
                        }
                    }
                 }
            }
        }
    } catch(e) {
        console.warn("Could not fetch via Business Manager, will try direct accounts.", e);
    }

    // --- STRATEGY 2: Fetch direct ad accounts (fallback) ---
    if (allAdAccounts.length === 0) {
        try {
            const adAccountsResponse = await fetch(`${META_GRAPH_API_URL}/me/adaccounts?fields=name,account_id&access_token=${accessToken}`);
            if (!adAccountsResponse.ok) {
                const errorData = await adAccountsResponse.json();
                fetchError = errorData;
            } else {
                 const adAccountsData = await adAccountsResponse.json() as any;
                 if (adAccountsData.data) {
                    allAdAccounts.push(...adAccountsData.data);
                 }
            }
        } catch(e) {
             console.warn("Could not fetch direct ad accounts.", e);
             fetchError = e;
        }
    }

    if (fetchError) {
        console.error("Failed to fetch any Meta ad accounts:", fetchError);
        return NextResponse.json({ error: 'Failed to fetch ad accounts from Meta.', details: fetchError }, { status: 500 });
    }
    
    if (allAdAccounts.length === 0) {
        return NextResponse.json({ campaigns: [] }); // No ad accounts found via any method
    }

    // 3. For each ad account, fetch its campaigns.
    const allCampaigns: MetaCampaign[] = [];
    // Use Promise.all to fetch campaigns concurrently for all accounts
    const campaignPromises = allAdAccounts.map(account => fetchCampaignsForAccount(account.account_id, account.name, accessToken));
    const results = await Promise.all(campaignPromises);

    // Flatten the array of campaign arrays
    results.forEach(campaigns => allCampaigns.push(...campaigns));
    
    // 4. Return the combined list of active campaigns.
    return NextResponse.json({ campaigns: allCampaigns });

  } catch (error: any) {
    console.error('Error in /api/meta/campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns', details: error.message }, { status: 500 });
  }
}
