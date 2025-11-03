import { type } from "os";
import { FieldValue } from "firebase/firestore";

export type User = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: 'admin' | 'collaborator';
  avatarUrl: string;
  groupId?: string;
};

export const leadTiers = ['Bas de gamme', 'Moyenne gamme', 'Haut de gamme'] as const;
export type LeadTier = (typeof leadTiers)[number];

export type Group = {
  id:string;
  name: string;
  collaboratorIds: string[];
};

export type Note = {
  id: string;
  content: string;
  createdAt: string; // ISO date string
  author: Pick<User, 'id' | 'name' | 'avatarUrl'>;
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
  company: string | null;
  phone: string | null;
  username: string | null;
  createdAt: FieldValue;
  assignedAt?: FieldValue;
  status: LeadStatus;
  assignedCollaboratorId: string | null;
  leadData: string; // Raw CSV row data as JSON
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
  avatarUrl: string;
  groupId?: string;
};

export type DistributionSetting = {
  id: string;
  groupId: string;
  dailyQuota: number;
  leadTier: LeadTier | 'Tous';
};

    