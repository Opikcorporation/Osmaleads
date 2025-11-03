import type { User, Group, Lead, Note } from './types';
import { PlaceHolderImages } from './placeholder-images';

let users: User[] = [
  { id: 'user-1', name: 'Alex Johnson', email: 'admin@example.com', role: 'admin', avatarUrl: PlaceHolderImages.find(p => p.id === 'user1')?.imageUrl || '' },
  { id: 'user-2', name: 'Maria Garcia', email: 'maria@example.com', role: 'collaborator', avatarUrl: PlaceHolderImages.find(p => p.id === 'user2')?.imageUrl || '', groupId: 'group-1' },
  { id: 'user-3', name: 'Chen Wei', email: 'chen@example.com', role: 'collaborator', avatarUrl: PlaceHolderImages.find(p => p.id === 'user3')?.imageUrl || '', groupId: 'group-1' },
  { id: 'user-4', name: 'Sam Miller', email: 'sam@example.com', role: 'collaborator', avatarUrl: PlaceHolderImages.find(p => p.id === 'user4')?.imageUrl || '', groupId: 'group-2' },
  { id: 'user-5', name: 'Fatima Al-Fassi', email: 'fatima@example.com', role: 'collaborator', avatarUrl: PlaceHolderImages.find(p => p.id === 'user5')?.imageUrl || '', groupId: 'group-2' },
];

let groups: Group[] = [
    { id: 'group-1', name: 'Alpha Team', memberIds: ['user-2', 'user-3'] },
    { id: 'group-2', name: 'Bravo Team', memberIds: ['user-4', 'user-5'] },
];

let leads: Lead[] = [
    {
        id: 'lead-1',
        name: 'John Doe',
        email: 'john.doe@acmecorp.com',
        company: 'Acme Corp',
        phone: '555-0101',
        createdAt: '2024-07-28T10:00:00Z',
        status: 'Qualified',
        assignedToId: 'user-2',
        profile: 'John Doe is a Senior Manager at Acme Corp, interested in enterprise solutions. Key pain points include scalability and integration issues with their current software stack. Shows high purchase intent.',
        notes: [
            { id: 'note-1', content: 'Initial contact made, scheduled a demo for next week.', createdAt: '2024-07-28T11:00:00Z', author: {id: 'user-2', name: 'Maria Garcia', avatarUrl: PlaceHolderImages.find(p => p.id === 'user2')?.imageUrl || ''} }
        ],
    },
    {
        id: 'lead-2',
        name: 'Jane Smith',
        email: 'jane.smith@techinnovate.com',
        company: 'Tech Innovate',
        phone: '555-0102',
        createdAt: '2024-07-27T14:30:00Z',
        status: 'Not Interested',
        assignedToId: 'user-3',
        profile: 'Jane Smith is a CTO at Tech Innovate. They have recently signed with a competitor and are not looking for new solutions at this time. Low potential for immediate conversion.',
        notes: [
            { id: 'note-2', content: 'Followed up on email. Mentioned they are locked into a contract for the next 2 years.', createdAt: '2024-07-27T15:00:00Z', author: {id: 'user-3', name: 'Chen Wei', avatarUrl: PlaceHolderImages.find(p => p.id === 'user3')?.imageUrl || ''} }
        ],
    },
    {
        id: 'lead-3',
        name: 'Peter Jones',
        email: 'peter.jones@startupz.io',
        company: 'StartupZ',
        phone: '555-0103',
        createdAt: '2024-07-29T09:00:00Z',
        status: 'New',
        assignedToId: null,
        profile: 'Peter Jones is the founder of StartupZ, a fast-growing tech startup. They are actively looking for solutions to manage their expanding customer base. Budget might be a concern.',
        notes: [],
    },
     {
        id: 'lead-4',
        name: 'Emily White',
        email: 'emily.white@globex.com',
        company: 'Globex Corporation',
        phone: '555-0104',
        createdAt: '2024-07-29T11:00:00Z',
        status: 'No Answer',
        assignedToId: 'user-4',
        profile: 'Emily White is a project lead at Globex. Has downloaded several whitepapers from our site. Seems interested in project management tools.',
        notes: [
            { id: 'note-3', content: 'Called twice, no answer. Left a voicemail.', createdAt: '2024-07-29T11:30:00Z', author: { id: 'user-4', name: 'Sam Miller', avatarUrl: PlaceHolderImages.find(p => p.id === 'user4')?.imageUrl || '' } }
        ],
    },
     {
        id: 'lead-5',
        name: 'Michael Brown',
        email: 'michael.brown@financiers.com',
        company: 'Financialiers Inc.',
        phone: '555-0105',
        createdAt: '2024-07-26T16:00:00Z',
        status: 'Signed',
        assignedToId: 'user-5',
        profile: 'Michael Brown, CFO at Financialiers Inc., was looking for a robust financial planning software. After a successful demo and trial period, he has signed a 2-year contract.',
        notes: [
            { id: 'note-4', content: 'Contract sent.', createdAt: '2024-07-25T10:00:00Z', author: { id: 'user-5', name: 'Fatima Al-Fassi', avatarUrl: PlaceHolderImages.find(p => p.id === 'user5')?.imageUrl || '' } },
            { id: 'note-5', content: 'Contract signed! Deal closed.', createdAt: '2024-07-26T15:45:00Z', author: { id: 'user-5', name: 'Fatima Al-Fassi', avatarUrl: PlaceHolderImages.find(p => p.id === 'user5')?.imageUrl || '' } }
        ],
    },
];

// Simulate a database with async functions
export const getLeads = async (filters?: { assignedToId?: string; status?: string }): Promise<Lead[]> => {
  await new Promise(res => setTimeout(res, 50));
  let filteredLeads = leads;
  if (filters?.assignedToId) {
    filteredLeads = filteredLeads.filter(lead => lead.assignedToId === filters.assignedToId);
  }
  if (filters?.status && filters.status !== 'All') {
    filteredLeads = filteredLeads.filter(lead => lead.status === filters.status);
  }
  return JSON.parse(JSON.stringify(filteredLeads));
};

export const getLeadById = async (id: string): Promise<Lead | undefined> => {
    await new Promise(res => setTimeout(res, 50));
    return JSON.parse(JSON.stringify(leads.find(lead => lead.id === id)));
}

export const getUsers = async (): Promise<User[]> => {
  await new Promise(res => setTimeout(res, 50));
  return JSON.parse(JSON.stringify(users));
};

export const getUserById = async (id: string): Promise<User | undefined> => {
    await new Promise(res => setTimeout(res, 50));
    return JSON.parse(JSON.stringify(users.find(user => user.id === id)));
}

export const getGroups = async (): Promise<Group[]> => {
    await new Promise(res => setTimeout(res, 50));
    return JSON.parse(JSON.stringify(groups));
}

// In-memory data manipulation for mock backend
export const updateLeadStatus = (id: string, status: Lead['status']) => {
    const lead = leads.find(l => l.id === id);
    if (lead) {
        lead.status = status;
    }
    return lead;
}

export const addLeadNote = (id: string, note: Omit<Note, 'id'>) => {
    const lead = leads.find(l => l.id === id);
    if (lead) {
        const newNote = { ...note, id: `note-${Date.now()}` };
        lead.notes.unshift(newNote);
        return newNote;
    }
    return null;
}

export const addLead = (lead: Omit<Lead, 'id'>) => {
    const newLead = { ...lead, id: `lead-${Date.now()}`};
    leads.unshift(newLead);
    return newLead;
}

export const assignLead = (leadId: string, userId: string | null) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
        lead.assignedToId = userId;
    }
    return lead;
}
