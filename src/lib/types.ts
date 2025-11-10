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

export type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  username: string | null;
  status: LeadStatus;
  tier: LeadTier | null;
  score: number | null;
  leadData: string; // Raw CSV row data as JSON
  assignedCollaboratorId: string | null;
  createdAt: Timestamp;
  assignedAt?: Timestamp;
  campaignId: string | null;
  campaignName: string | null;
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
