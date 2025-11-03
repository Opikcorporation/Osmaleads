'use server';

/**
 * @fileOverview An AI agent that intelligently distributes unassigned leads, respecting admin-defined rules.
 *
 * - distributeLeads - The main function to trigger the lead distribution.
 * - DistributeLeadsInput - The input type (currently empty).
 * - DistributeLeadsOutput - The return type, indicating the number of distributed leads.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { Lead, Collaborator, Group, DistributionSetting } from '@/lib/types';

// Define the input and output schemas
const DistributeLeadsInputSchema = z.object({});
export type DistributeLeadsInput = z.infer<typeof DistributeLeadsInputSchema>;

const DistributeLeadsOutputSchema = z.object({
  distributedCount: z.number().describe('The number of leads that were successfully distributed.'),
});
export type DistributeLeadsOutput = z.infer<typeof DistributeLeadsOutputSchema>;

// Wrapper function to be called from the client
export async function distributeLeads(input: DistributeLeadsInput): Promise<DistributeLeadsOutput> {
  return distributeLeadsFlow(input);
}

// Helper to count leads assigned today
const getTodaysAssignments = async (firestore: FirebaseFirestore.Firestore): Promise<{ [collaboratorId: string]: number }> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const assignmentsCount: { [collaboratorId: string]: number } = {};
    const leadsAssignedTodayQuery = firestore.collection('leads')
        .where('assignedAt', '>=', today)
        .where('assignedAt', '<', tomorrow);
    
    const snapshot = await leadsAssignedTodayQuery.get();
    snapshot.forEach(doc => {
        const lead = doc.data() as Lead;
        if (lead.assignedCollaboratorId) {
            assignmentsCount[lead.assignedCollaboratorId] = (assignmentsCount[lead.assignedCollaboratorId] || 0) + 1;
        }
    });
    return assignmentsCount;
};


const distributeLeadsFlow = ai.defineFlow(
  {
    name: 'distributeLeadsFlow',
    inputSchema: DistributeLeadsInputSchema,
    outputSchema: DistributeLeadsOutputSchema,
  },
  async () => {
    const { firestore } = getFirebaseAdmin();
    const serverTimestamp = require('firebase-admin/firestore').FieldValue.serverTimestamp;

    // 1. Fetch all necessary data
    const unassignedLeadsSnap = await firestore.collection('leads').where('assignedCollaboratorId', '==', null).get();
    const unassignedLeads = unassignedLeadsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Lead[];

    if (unassignedLeads.length === 0) {
      return { distributedCount: 0 };
    }

    const groupsSnap = await firestore.collection('groups').get();
    const groups = groupsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Group[];

    const settingsSnap = await firestore.collection('distributionSettings').get();
    const settings = settingsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as DistributionSetting[];
    const settingsByGroupId = Object.fromEntries(settings.map(s => [s.groupId, s]));

    const collaboratorsSnap = await firestore.collection('collaborators').get();
    const collaborators = collaboratorsSnap.docs.map(c => ({...c.data(), id: c.id})) as Collaborator[];
    const collaboratorsById = Object.fromEntries(collaborators.map(c => [c.id, c]));

    const todaysAssignments = await getTodaysAssignments(firestore);


    // 2. Determine eligible collaborators based on rules
    const eligibleCollaboratorIds = new Set<string>();
    for (const group of groups) {
      const rule = settingsByGroupId[group.id];
      if (!rule) continue; // No rules for this group

      // Calculate how many leads this group has received today
      const groupLeadsToday = (group.collaboratorIds || []).reduce((sum, memberId) => sum + (todaysAssignments[memberId] || 0), 0);

      // If the group is under its daily quota, its members are eligible
      if (groupLeadsToday < rule.leadsPerDay) {
        (group.collaboratorIds || []).forEach(memberId => eligibleCollaboratorIds.add(memberId));
      }
    }

    const eligibleCollaborators = Array.from(eligibleCollaboratorIds).map(id => collaboratorsById[id]).filter(Boolean);

    if (eligibleCollaborators.length === 0) {
        return { distributedCount: 0 }; // No one is eligible to receive leads
    }

    // 3. Process each lead and assign it
    const assignments: { leadId: string, collaboratorId: string }[] = [];
    const currentAssignmentsCount: { [collaboratorId: string]: number } = { ...todaysAssignments };
    
    // We create a temporary sorted list of collaborators by current load for round-robin
    const sortedEligibleCollaborators = [...eligibleCollaborators].sort((a,b) => (currentAssignmentsCount[a.id] || 0) - (currentAssignmentsCount[b.id] || 0));

    for (const lead of unassignedLeads) {
        // Simple round-robin among eligible collaborators
        if(sortedEligibleCollaborators.length > 0){
            const collaboratorToAssign = sortedEligibleCollaborators[0];
            assignments.push({ leadId: lead.id, collaboratorId: collaboratorToAssign.id });
            
            // Update local count and re-sort for the next iteration
            currentAssignmentsCount[collaboratorToAssign.id] = (currentAssignmentsCount[collaboratorToAssign.id] || 0) + 1;
            sortedEligibleCollaborators.sort((a,b) => (currentAssignmentsCount[a.id] || 0) - (currentAssignmentsCount[b.id] || 0));
        }
    }
    
    // 4. Batch write assignments to Firestore
    if (assignments.length > 0) {
      const batch = firestore.batch();
      for (const { leadId, collaboratorId } of assignments) {
        const leadRef = firestore.collection('leads').doc(leadId);
        batch.update(leadRef, { 
          assignedCollaboratorId: collaboratorId,
          status: 'New',
          assignedAt: serverTimestamp() // Add a timestamp for the assignment
        });
      }
      await batch.commit();
    }

    return { distributedCount: assignments.length };
  }
);
