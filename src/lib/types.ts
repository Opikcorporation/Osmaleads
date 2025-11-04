'use client';
import { FieldValue } from "firebase/firestore";

export type User = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: 'admin' | 'collaborator';
  avatarColor: string;
};

export const leadTiers = ['Haut de gamme', 'Moyenne gamme', 'Bas de gamme'] as const;
export type LeadTier = (typeof leadTiers)[number];

export type Note = {
  id: string;
  content: string;
  createdAt: string; // ISO date string
  author: Pick<User, 'id' | 'name' | 'avatarColor'>;
};

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
  assignedAt?: FieldValue;
};

export type FirestoreNote = {
  id: string;
  leadId: string;
  collaboratorId: string;
  timestamp: any;
  content: string;
};

export type Collaborator = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: 'admin' | 'collaborator';
  avatarColor: string;
};
