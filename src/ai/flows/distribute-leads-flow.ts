'use server';

/**
 * @fileOverview An AI agent that intelligently distributes unassigned leads.
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
    
    if (unassignedLeads.length === 0) {
      return { distributedCount: 0 };
    }
    
    const groupsSnap = await firestore.collection('groups').get();
    const groups = groupsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Group[];

    const collaboratorsSnap = await firestore.collection('collaborators').get();
    const collaborators = collaboratorsSnap.docs.map(c => ({...c.data(), id: c.id})) as Collaborator[];
    
    // We'll track assignments to help with round-robin within groups
    const assignmentsCount: { [collaboratorId: string]: number } = {};
    collaborators.forEach(c => assignmentsCount[c.id] = 0);


    // 2. Process each lead
    const assignments: { leadId: string, collaboratorId: string }[] = [];

    for (const lead of unassignedLeads) {
      // Find eligible collaborators from all groups
      const allEligibleCollaborators = groups.flatMap(g => g.collaboratorIds || []);

      if (allEligibleCollaborators.length === 0) {
        continue; // No one to assign to, skip.
      }
      
      // Basic round-robin: find the collaborator with the fewest assignments
      const bestCollaboratorId = allEligibleCollaborators
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
