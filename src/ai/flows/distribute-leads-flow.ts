'use server';

/**
 * @fileOverview An AI agent that intelligently distributes unassigned leads to a specific group, respecting admin-defined rules.
 *
 * - distributeLeadsForGroup - The main function to trigger the lead distribution for a single group.
 * - DistributeLeadsForGroupInput - The input type for the function.
 * - DistributeLeadsForGroupOutput - The return type, indicating the number of distributed leads.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { Lead, Collaborator, Group, DistributionSetting } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

// Define the input and output schemas
const DistributeLeadsForGroupInputSchema = z.object({
    groupId: z.string().describe("The ID of the group to distribute leads to."),
});
export type DistributeLeadsForGroupInput = z.infer<typeof DistributeLeadsForGroupInputSchema>;

const DistributeLeadsForGroupOutputSchema = z.object({
  distributedCount: z.number().describe('The number of leads that were successfully distributed.'),
});
export type DistributeLeadsForGroupOutput = z.infer<typeof DistributeLeadsForGroupOutputSchema>;

// Wrapper function to be called from the client
export async function distributeLeadsForGroup(input: DistributeLeadsForGroupInput): Promise<DistributeLeadsForGroupOutput> {
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
    inputSchema: DistributeLeadsForGroupInputSchema,
    outputSchema: DistributeLeadsForGroupOutputSchema,
  },
  async ({ groupId }) => {
    const { firestore } = getFirebaseAdmin();
    const serverTimestamp = FieldValue.serverTimestamp;

    // 1. Fetch data for the specific group
    const groupSnap = await firestore.collection('groups').doc(groupId).get();
    if (!groupSnap.exists) {
        throw new Error(`Group with ID ${groupId} not found.`);
    }
    const group = { ...groupSnap.data(), id: groupSnap.id } as Group;

    const settingsSnap = await firestore.collection('distributionSettings').where('groupId', '==', groupId).limit(1).get();
    if (settingsSnap.empty) {
        return { distributedCount: 0 }; // No settings for this group
    }
    const setting = { ...settingsSnap.docs[0].data(), id: settingsSnap.docs[0].id } as DistributionSetting;
    
    const eligibleCollaborators = group.collaboratorIds || [];
    if(eligibleCollaborators.length === 0){
        return { distributedCount: 0 }; // No one to assign to
    }
    
    // 2. Fetch unassigned leads matching the group's tier
    let unassignedLeadsQuery = firestore.collection('leads').where('assignedCollaboratorId', '==', null);
    if (setting.leadTier !== 'Tous') {
        unassignedLeadsQuery = unassignedLeadsQuery.where('tier', '==', setting.leadTier);
    }
    const unassignedLeadsSnap = await unassignedLeadsQuery.get();
    let unassignedLeads = unassignedLeadsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Lead[];
    
    if (unassignedLeads.length === 0) {
      return { distributedCount: 0 };
    }

    // 3. Determine how many leads can be assigned based on quota
    const todaysAssignments = await getTodaysAssignments(firestore);
    const groupLeadsToday = eligibleCollaborators.reduce((sum, memberId) => sum + (todaysAssignments[memberId] || 0), 0);
    
    let leadsToAssignCount = setting.dailyQuota - groupLeadsToday;
    if (leadsToAssignCount <= 0) {
        return { distributedCount: 0 }; // Quota reached
    }

    // Limit leads to the available quota
    unassignedLeads = unassignedLeads.slice(0, leadsToAssignCount);

    // 4. Assign leads using a simple round-robin logic within the group
    const assignments: { leadId: string, collaboratorId: string }[] = [];
    const currentAssignmentsCount = { ...todaysAssignments };
    
    // Create a temporary sorted list of collaborators by current load for round-robin
    const sortedEligibleCollaborators = [...eligibleCollaborators].sort((a,b) => (currentAssignmentsCount[a] || 0) - (currentAssignmentsCount[b] || 0));

    for (const lead of unassignedLeads) {
        const collaboratorToAssignId = sortedEligibleCollaborators[0];
        if (collaboratorToAssignId) {
            assignments.push({ leadId: lead.id, collaboratorId: collaboratorToAssignId });
            
            // Update local count and re-sort for the next iteration
            currentAssignmentsCount[collaboratorToAssignId] = (currentAssignmentsCount[collaboratorToAssignId] || 0) + 1;
            sortedEligibleCollaborators.sort((a,b) => (currentAssignmentsCount[a] || 0) - (currentAssignmentsCount[b] || 0));
        }
    }
    
    // 5. Batch write assignments to Firestore
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

    