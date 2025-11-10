
'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { IntegrationSetting } from '@/lib/types';
import { NextResponse } from 'next/server';
import fetch from 'node-fetch';

const META_GRAPH_API_URL = 'https://graph.facebook.com/v19.0';

type MetaCampaign = {
    id: string;
    name: string;
    account: string; // This can be a page name or an account name
};

type AdAccount = {
    id: string;
    name: string;
    account_id: string;
};

type Page = {
    id: string;
    name: string;
    access_token: string;
};

/**
 * Fetches campaigns for a given ad account ID.
 */
async function fetchCampaignsForAccount(accountId: string, accountName: string, accessToken: string): Promise<MetaCampaign[]> {
    const url = `${META_GRAPH_API_URL}/${accountId}/campaigns?fields=name,effective_status&access_token=${accessToken}`;
    try {
        const campaignsResponse = await fetch(url);
        if (!campaignsResponse.ok) {
            console.warn(`Could not fetch campaigns for account ${accountName} (${accountId}). Status: ${campaignsResponse.status}. Skipping.`);
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
    } catch(e) {
        console.error(`Error fetching campaigns from URL ${url}:`, e);
    }
    return [];
}

/**
 * Fetches campaigns linked to leadgen forms on a specific page.
 * This is a more reliable method for Lead Ads.
 */
async function fetchCampaignsFromPage(page: Page): Promise<MetaCampaign[]> {
    // CRUCIAL: Use the specific page access token for this request
    const pageAccessToken = page.access_token;
    const url = `${META_GRAPH_API_URL}/${page.id}/leadgen_forms?fields=campaign.name,campaign.effective_status&access_token=${pageAccessToken}`;

    try {
        const formsResponse = await fetch(url);
        if (!formsResponse.ok) {
            console.warn(`Could not fetch forms/campaigns for page ${page.name} (${page.id}). Status: ${formsResponse.status}. Skipping.`);
            return [];
        }

        const formsData = await formsResponse.json() as any;
        if (!formsData.data) return [];
        
        const campaigns: { [id: string]: MetaCampaign } = {};

        formsData.data.forEach((form: any) => {
            const campaign = form.campaign;
            if (campaign && campaign.effective_status === 'ACTIVE') {
                 // Use a map to store unique campaigns
                campaigns[campaign.id] = {
                    id: campaign.id,
                    name: campaign.name,
                    account: page.name // Attribute the campaign to the page it came from
                };
            }
        });
        
        // Return an array of the unique campaign values
        return Object.values(campaigns);

    } catch (e) {
        console.error(`Error fetching campaigns from page forms at URL ${url}:`, e);
    }
    return [];
}


/**
 * API route to fetch advertising campaigns from Meta.
 * It uses the access token stored in the integration settings.
 * This version is more robust, first trying to find campaigns via Pages (most reliable for leadgen),
 * then falling back to Business Manager and direct ad accounts.
 */
export async function GET(request: Request) {
  const { firestore } = getFirebaseAdmin();
  
  try {
    const settingsSnap = await firestore.collection('integrationSettings').where('integrationName', '==', 'meta').limit(1).get();
    if (settingsSnap.empty) {
      return NextResponse.json({ error: 'Meta integration not configured.' }, { status: 404 });
    }
    const metaSettings = settingsSnap.docs[0].data() as IntegrationSetting;
    const userAccessToken = metaSettings.accessToken;
    if (!userAccessToken) {
        return NextResponse.json({ error: 'Meta access token is missing.' }, { status: 400 });
    }

    const allCampaigns: { [id: string]: MetaCampaign } = {};
    let fetchError: any = null;

    // --- STRATEGY 1: Fetch via Pages and Leadgen Forms (Most Reliable for Lead Ads) ---
    try {
        const pagesResponse = await fetch(`${META_GRAPH_API_URL}/me/accounts?fields=name,access_token&access_token=${userAccessToken}`);
        if(pagesResponse.ok) {
            const pagesData = await pagesResponse.json() as { data: Page[] };
            if (pagesData.data && pagesData.data.length > 0) {
                const pageCampaignPromises = pagesData.data.map(page => fetchCampaignsFromPage(page));
                const results = await Promise.all(pageCampaignPromises);
                results.flat().forEach(campaign => {
                    allCampaigns[campaign.id] = campaign;
                });
            }
        } else {
             const errorData = await pagesResponse.json();
             console.warn("Could not fetch pages, will try other methods.", errorData);
        }
    } catch(e) {
         console.warn("Could not fetch via Pages, will try other methods.", e);
    }

    // --- STRATEGY 2: Fetch via Business Manager (if pages yielded nothing) ---
    if (Object.keys(allCampaigns).length === 0) {
        try {
            const allAdAccounts: AdAccount[] = [];
            const businessesResponse = await fetch(`${META_GRAPH_API_URL}/me/businesses?access_token=${userAccessToken}`);
            if (businessesResponse.ok) {
                const businessesData = await businessesResponse.json() as any;
                if (businessesData.data && businessesData.data.length > 0) {
                     for (const business of businessesData.data) {
                        const ownedAdAccountsResponse = await fetch(`${META_GRAPH_API_URL}/${business.id}/owned_ad_accounts?fields=name,account_id&access_token=${userAccessToken}`);
                        if(ownedAdAccountsResponse.ok) {
                            const adAccountsData = await ownedAdAccountsResponse.json() as any;
                            if(adAccountsData.data) allAdAccounts.push(...adAccountsData.data);
                        }
                     }
                }
            }
            if (allAdAccounts.length > 0) {
                 const campaignPromises = allAdAccounts.map(account => fetchCampaignsForAccount(account.account_id, account.name, userAccessToken));
                 const results = await Promise.all(campaignPromises);
                 results.flat().forEach(campaign => {
                    allCampaigns[campaign.id] = campaign;
                 });
            }
        } catch(e) {
            console.warn("Could not fetch via Business Manager, will try direct accounts.", e);
        }
    }


    // --- STRATEGY 3: Fetch direct ad accounts (final fallback) ---
    if (Object.keys(allCampaigns).length === 0) {
        try {
            const adAccountsResponse = await fetch(`${META_GRAPH_API_URL}/me/adaccounts?fields=name,account_id&access_token=${userAccessToken}`);
            if (adAccountsResponse.ok) {
                 const adAccountsData = await adAccountsResponse.json() as any;
                 if (adAccountsData.data && adAccountsData.data.length > 0) {
                    const campaignPromises = adAccountsData.data.map((account: any) => fetchCampaignsForAccount(account.account_id, account.name, userAccessToken));
                    const results = await Promise.all(campaignPromises);
                    results.flat().forEach(campaign => {
                        allCampaigns[campaign.id] = campaign;
                    });
                 }
            } else {
                 const errorData = await adAccountsResponse.json();
                 fetchError = errorData;
            }
        } catch(e) {
             console.warn("Could not fetch direct ad accounts.", e);
             fetchError = e;
        }
    }
    
    const uniqueCampaigns = Object.values(allCampaigns);

    if (uniqueCampaigns.length === 0 && fetchError) {
        console.error("Failed to fetch any Meta ad accounts:", fetchError);
        return NextResponse.json({ error: 'Failed to fetch ad accounts from Meta.', details: fetchError }, { status: 500 });
    }

    return NextResponse.json({ campaigns: uniqueCampaigns });

  } catch (error: any) {
    console.error('Error in /api/meta/campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns', details: error.message }, { status: 500 });
  }
}
