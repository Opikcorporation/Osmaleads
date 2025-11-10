
'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { IntegrationSetting } from '@/lib/types';
import { NextResponse } from 'next/server';
import fetch from 'node-fetch';

const META_GRAPH_API_URL = 'https://graph.facebook.com/v19.0';

type MetaCampaign = {
    id: string;
    name: string;
    account: string; // This is the Page Name
    page_id: string; // The Page ID
    subscribed: boolean;
};

type Page = {
    id: string;
    name: string;
    access_token: string;
};

/**
 * Generates an App Access Token using the App ID and App Secret.
 * This token is used for server-to-server calls.
 */
async function getAppAccessToken(): Promise<string | null> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
        console.warn("META_APP_ID or META_APP_SECRET not set. Cannot generate App Access Token.");
        return null;
    }

    try {
        const url = `${META_GRAPH_API_URL}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`;
        const response = await fetch(url);
        const data = await response.json() as any;
        return data.access_token || null;
    } catch (e) {
        console.error("Error generating App Access Token:", e);
        return null;
    }
}


/**
 * Checks which pages are currently subscribed to the leadgen webhook.
 */
async function getSubscribedPages(pageIds: string[]): Promise<Set<string>> {
    const appId = process.env.META_APP_ID;
    const appAccessToken = await getAppAccessToken();

    if (!appId || !appAccessToken) {
        console.warn("META_APP_ID or App Access Token not available. Cannot check subscription status.");
        return new Set();
    }
    
    const subscribedPages = new Set<string>();

    for (const pageId of pageIds) {
         try {
            const url = `${META_GRAPH_API_URL}/${pageId}/subscribed_apps?subscribed_fields=leadgen&access_token=${appAccessToken}`;
            const response = await fetch(url);
            const data = await response.json() as any;
            // Check if our app (by its ID) is in the list of subscribed apps for the 'leadgen' field.
            if (data.data?.some((app: any) => app.id === appId && app.subscribed_fields?.includes('leadgen'))) {
                subscribedPages.add(pageId);
            }
        } catch(e) {
            console.error(`Error checking subscription for page ${pageId}:`, e);
        }
    }
    return subscribedPages;
}


/**
 * Fetches campaigns linked to leadgen forms on a specific page.
 */
async function fetchCampaignsFromPage(page: Page, isSubscribed: boolean): Promise<MetaCampaign[]> {
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
                campaigns[campaign.id] = {
                    id: campaign.id,
                    name: campaign.name,
                    account: page.name,
                    page_id: page.id,
                    subscribed: isSubscribed
                };
            }
        });
        
        return Object.values(campaigns);

    } catch (e) {
        console.error(`Error fetching campaigns from page forms at URL ${url}:`, e);
    }
    return [];
}


/**
 * API route to fetch advertising campaigns from Meta.
 * It uses the access token stored in the integration settings.
 * This version is more robust, first trying to find campaigns via Pages (most reliable for leadgen).
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

    try {
        const pagesResponse = await fetch(`${META_GRAPH_API_URL}/me/accounts?fields=name,access_token&access_token=${userAccessToken}`);
        
        // --- CRITICAL ERROR HANDLING ---
        if(!pagesResponse.ok) {
             const errorData = await pagesResponse.json();
             console.error("Critical Error: Could not fetch pages from Meta.", errorData);
             // Directly return the error instead of continuing
             return NextResponse.json({ error: 'Failed to fetch pages from Meta. The token might be invalid or miss permissions.', details: errorData }, { status: 500 });
        }

        const pagesData = await pagesResponse.json() as { data: Page[] };
        if (pagesData.data && pagesData.data.length > 0) {
            const pageIds = pagesData.data.map(p => p.id);
            const subscribedPageIds = await getSubscribedPages(pageIds);

            const pageCampaignPromises = pagesData.data.map(page => 
                fetchCampaignsFromPage(page, subscribedPageIds.has(page.id))
            );
            
            const results = await Promise.all(pageCampaignPromises);
            results.flat().forEach(campaign => {
                allCampaigns[campaign.id] = campaign;
            });
        }
    } catch(e: any) {
         console.error("Could not fetch via Pages.", e);
         fetchError = { message: e.message }; // Make sure error is serializable
    }
    
    const uniqueCampaigns = Object.values(allCampaigns);

    if (uniqueCampaigns.length === 0 && fetchError) {
        console.error("Failed to fetch any Meta pages or campaigns:", fetchError);
        return NextResponse.json({ error: 'Failed to fetch pages from Meta. The token might be invalid or miss permissions.', details: fetchError }, { status: 500 });
    }

    return NextResponse.json({ campaigns: uniqueCampaigns });

  } catch (error: any) {
    console.error('Error in /api/meta/campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns', details: error.message }, { status: 500 });
  }
}
