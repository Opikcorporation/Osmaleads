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

// This type represents the final, clean structure of a Lead document in Firestore.
export type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null; // Kept for potential manual entry
  username: string | null; // Kept for potential manual entry
  status: LeadStatus;
  tier: LeadTier | null;
  score: number | null;
  
  // This stores the original, unmodified JSON payload from Zapier.
  // Useful for debugging and future-proofing if new fields are added to forms.
  leadData: string; 
  
  assignedCollaboratorId: string | null;
  createdAt: Timestamp;
  assignedAt?: Timestamp;
  
  // Standardized fields extracted from the Zapier payload for easy querying and display
  zapName: string | null;
  intention: string | null; // e.g., "Dans les 3 prochains mois"
  budget: string | null; // e.g., "1000€ - 2000€"
  objectif: string | null; // e.g., "rendement_locatif"
  typeDeBien: string | null; // e.g., "studio"
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


export type ScoringRule = {
    id: string;
    zapName: string;
    rules: {
        [question: string]: {
            [answer: string]: number; // Map of answer to score
        };
    };
    // To track which questions have been configured
    configuredQuestions: string[];
};
