'use client';
import { Timestamp } from "firebase/firestore";

export const leadTiers = ['Haut de gamme', 'Moyenne gamme', 'Bas de gamme'] as const;
export type LeadTier = (typeof leadTiers)[number];

export const leadStatuses = [
  'New',
  'Qualified',
  'Not Qualified',
  'No Answer',
  'Not Interested',
  'Signed',
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

// This type is now more flexible to handle data directly from Zapier
export type Lead = {
  id: string;
  name?: string; // App's standard field
  nom?: string;   // Zapier's field (legacy)
  email: string | null;
  phone?: string | null; // App's standard field
  telephone?: string | null; // Zapier's field (legacy)
  company: string | null;
  username: string | null;
  status?: LeadStatus; // Status might not be present on Zapier-created leads
  tier: LeadTier | null;
  score: number | null;
  leadData?: string; // May or may not be used
  assignedCollaboratorId: string | null;
  createdAt?: Timestamp; // May not be present on all docs
  'Created Time'?: string; // Zapier's field
  created_time?: string; // Zapier's field (alternative)
  assignedAt?: Timestamp;
  campaignId: string | null;
  campaignName?: string | null; // App's standard field
  nom_campagne?: string; // Zapier's field (legacy)
  'Form Name'?: string; // New campaign name field from Zapier

  // Direct Zapier fields that might exist at the root
  objectif?: string;
  budget?: string;
  temps?: string;
  'Quel Est Votre Budget'?: string;
  'Vous Recherchez'?: string;
  'Votre Intention Dachat'?: string;
};


export type FirestoreNote = {
  id: string;
  leadId: string;
  collaboratorId: string;
  timestamp: Timestamp;
  content: string;
};

export type Collaborator = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'admin' | 'collaborator';
  avatarColor: string;
};

export type Group = {
    id: string;
    name: string;
    collaboratorIds: string[];
}

export type DistributionSetting = {
    id: string;
    groupId: string;
    dailyQuota: number;
    leadTier: LeadTier | 'Tous';
}

export type IntegrationSetting = {
  id: string;
  integrationName: 'meta';
  enabledCampaignIds: string[];
  subscribedPageIds?: string[];
  accessToken: string;
  lastSync?: Timestamp;
};
