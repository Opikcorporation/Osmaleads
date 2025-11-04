'use server';
/**
 * @fileOverview An AI agent that analyzes the current lead situation and proposes a distribution strategy.
 *
 * - suggestRedistributionStrategy - The main function to trigger the strategy generation for a group.
 * - SuggestRedistributionStrategyInput - The input type for the function.
 * - SuggestRedistributionStrategyOutput - The return type, containing the list of proposed assignments.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { Lead, Collaborator, Group, DistributionSetting } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

const AssignmentActionSchema = z.object({
  leadId: z.string(),
  collaboratorId: z.string(),
});
export type AssignmentAction = z.infer<typeof AssignmentActionSchema>;

const SuggestRedistributionStrategyInputSchema = z.object({
    groupId: z.string().describe("The ID of the group to generate a distribution strategy for."),
});
export type SuggestRedistributionStrategyInput = z.infer<typeof SuggestRedistributionStrategyInputSchema>;

const SuggestRedistributionStrategyOutputSchema = z.object({
  assignments: z.array(AssignmentActionSchema).describe("The list of lead-to-collaborator assignments to perform."),
});
export type SuggestRedistributionStrategyOutput = z.infer<typeof SuggestRedistributionStrategyOutputSchema>;


export async function suggestRedistributionStrategy(input: SuggestRedistributionStrategyInput): Promise<SuggestRedistributionStrategyOutput> {
  return suggestRedistributionStrategyFlow(input);
}


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

const suggestRedistributionStrategyFlow = ai.defineFlow(
  {
    name: 'suggestRedistributionStrategyFlow',
    inputSchema: SuggestRedistributionStrategyInputSchema,
    outputSchema: SuggestRedistributionStrategyOutputSchema,
  },
  async ({ groupId }) => {
    const { firestore } = getFirebaseAdmin();

    const groupSnap = await firestore.collection('groups').doc(groupId).get();
    if (!groupSnap.exists) {
        throw new Error(`Group with ID ${groupId} not found.`);
    }
    const group = { ...groupSnap.data(), id: groupSnap.id } as Group;

    const settingsSnap = await firestore.collection('distributionSettings').where('groupId', '==', groupId).limit(1).get();
    if (settingsSnap.empty) {
        return { assignments: [] }; 
    }
    const setting = { ...settingsSnap.docs[0].data(), id: settingsSnap.docs[0].id } as DistributionSetting;
    
    const eligibleCollaborators = group.collaboratorIds || [];
    if(eligibleCollaborators.length === 0){
        return { assignments: [] };
    }
    
    let unassignedLeadsQuery = firestore.collection('leads').where('assignedCollaboratorId', '==', null);
    if (setting.leadTier !== 'Tous') {
        unassignedLeadsQuery = unassignedLeadsQuery.where('tier', '==', setting.leadTier);
    }
    const unassignedLeadsSnap = await unassignedLeadsQuery.get();
    let unassignedLeads = unassignedLeadsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Lead[];
    
    if (unassignedLeads.length === 0) {
      return { assignments: [] };
    }

    const todaysAssignments = await getTodaysAssignments(firestore);
    const groupLeadsToday = eligibleCollaborators.reduce((sum, memberId) => sum + (todaysAssignments[memberId] || 0), 0);
    
    let leadsToAssignCount = setting.dailyQuota - groupLeadsToday;
    if (leadsToAssignCount <= 0) {
        return { assignments: [] }; 
    }

    unassignedLeads = unassignedLeads.slice(0, leadsToAssignCount);

    const assignments: AssignmentAction[] = [];
    const currentAssignmentsCount = { ...todaysAssignments };
    
    const sortedEligibleCollaborators = [...eligibleCollaborators].sort((a,b) => (currentAssignmentsCount[a] || 0) - (currentAssignmentsCount[b] || 0));

    for (const lead of unassignedLeads) {
        const collaboratorToAssignId = sortedEligibleCollaborators[0];
        if (collaboratorToAssignId) {
            assignments.push({ leadId: lead.id, collaboratorId: collaboratorToAssignId });
            
            currentAssignmentsCount[collaboratorToAssignId] = (currentAssignmentsCount[collaboratorToAssignId] || 0) + 1;
            sortedEligibleCollaborators.sort((a,b) => (currentAssignmentsCount[a] || 0) - (currentAssignmentsCount[b] || 0));
        }
    }
    
    return { assignments };
  }
);
