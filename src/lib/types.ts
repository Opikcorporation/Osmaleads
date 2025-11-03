import { type } from "os";

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'collaborator';
  avatarUrl: string;
  groupId?: string;
};

export type Group = {
  id:string;
  name: string;
  memberIds: string[];
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
  email: string;
  company: string;
  phone: string;
  createdAt: string; // ISO date string
  status: LeadStatus;
  assignedToId: string | null;
  profile: string; // AI generated profile
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
  email: string | null;
  role: 'admin' | 'collaborator';
  avatarUrl: string;
  groupId?: string;
};
