'use server';

/**
 * @fileOverview An AI agent that intelligently distributes unassigned leads based on scoring and group specialization.
 *
 * - distributeLeads - The main function to trigger the lead distribution.
 * - DistributeLeadsInput - The input type (currently empty).
 * - DistributeLeadsOutput - The return type, indicating the number of distributed leads.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { Lead, Collaborator, Group } from '@/lib/types';
import { suggestRedistributionStrategy } from './suggest-redistribution-strategy';

// Define the input schema for the main flow
const DistributeLeadsInputSchema = z.object({});
export type DistributeLeadsInput = z.infer<typeof DistributeLeadsInputSchema>;

// Define the output schema for the main flow
const DistributeLeadsOutputSchema = z.object({
  distributedCount: z.number().describe('The number of leads that were successfully distributed.'),
});
export type DistributeLeadsOutput = z.infer<typeof DistributeLeadsOutputSchema>;

// Wrapper function to be called from the client
export async function distributeLeads(input: DistributeLeadsInput): Promise<DistributeLeadsOutput> {
  return distributeLeadsFlow(input);
}


const distributeLeadsFlow = ai.defineFlow(
  {
    name: 'distributeLeadsFlow',
    inputSchema: DistributeLeadsInputSchema,
    outputSchema: DistributeLeadsOutputSchema,
  },
  async () => {
    const { firestore } = getFirebaseAdmin();
    let distributedCount = 0;

    // 1. Fetch all necessary data from Firestore using the Admin SDK
    const unassignedLeadsQuery = firestore.collection('leads').where('assignedCollaboratorId', '==', null);
    const unassignedLeadsSnap = await unassignedLeadsQuery.get();
    const unassignedLeads = unassignedLeadsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Lead[];
    
    // Sort leads by score, descending (Haut de gamme first)
    unassignedLeads.sort((a, b) => (b.score || 0) - (a.score || 0));

    if (unassignedLeads.length === 0) {
      return { distributedCount: 0 };
    }
    
    const groupsSnap = await firestore.collection('groups').get();
    const groups = groupsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Group[];
    
    // We'll track assignments to help with round-robin within groups
    const assignmentsCount: { [collaboratorId: string]: number } = {};

    // 2. Process each lead, starting from the highest score
    const assignments: { leadId: string, collaboratorId: string }[] = [];

    for (const lead of unassignedLeads) {
      // Find groups eligible for this lead's tier
      const eligibleGroups = groups.filter(g => 
        g.collaboratorIds && g.collaboratorIds.length > 0 &&
        g.acceptedTiers && g.acceptedTiers.includes(lead.tier)
      );

      if (eligibleGroups.length === 0) {
        continue; // No group can handle this lead, skip for now.
      }

      // Simple strategy: find the collaborator with the fewest assignments among all eligible groups.
      // This can be enhanced with AI suggestions later.
      let bestCollaboratorId: string | null = null;
      let minLeads = Infinity;

      const allEligibleCollaborators = eligibleGroups.flatMap(g => g.collaboratorIds);

      if (allEligibleCollaborators.length === 0) {
        continue;
      }
      
      // Basic round-robin among eligible collaborators
      bestCollaboratorId = allEligibleCollaborators
        .map(id => ({ id, count: assignmentsCount[id] || 0 }))
        .sort((a, b) => a.count - b.count)[0].id;


      if (bestCollaboratorId) {
          assignments.push({ leadId: lead.id, collaboratorId: bestCollaboratorId });
          // Update assignment count for the chosen collaborator
          assignmentsCount[bestCollaboratorId] = (assignmentsCount[bestCollaboratorId] || 0) + 1;
      }
    }

    // 3. Batch write assignments to Firestore
    if (assignments.length > 0) {
      const batch = firestore.batch();
      for (const { leadId, collaboratorId } of assignments) {
        const leadRef = firestore.collection('leads').doc(leadId);
        batch.update(leadRef, { assignedCollaboratorId: collaboratorId, status: 'New' });
      }
      await batch.commit();
      distributedCount = assignments.length;
    }

    return { distributedCount };
  }
);
