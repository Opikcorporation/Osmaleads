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
import type { Lead, Collaborator, DistributionSetting, Group } from '@/lib/types';
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
    
    const settingsSnap = await firestore.collection('distributionSettings').get();
    const settings = settingsSnap.docs.map(d => d.data()) as DistributionSetting[];

    const groupsSnap = await firestore.collection('groups').get();
    const groups = groupsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Group[];
    
    const collaboratorsSnap = await firestore.collection('collaborators').get();
    const collaborators = collaboratorsSnap.docs.map(d => d.data()) as Collaborator[];

    // 2. Create a map for easy lookup
    const collaboratorMap = new Map(collaborators.map(c => [c.id, c]));
    const groupMap = new Map(groups.map(g => [g.id, g]));

    // 3. Process each lead to find the best collaborator
    const assignments: { leadId: string, collaboratorId: string }[] = [];

    for (const lead of unassignedLeads) {
      // Simulate creating performance data string - this could be more sophisticated
      const groupPerformanceData = "All groups are performing equally at this time.";

      const suggestion = await suggestRedistributionStrategy({
        leadProfile: lead.aiProfile,
        groupPerformanceData,
        currentTime: new Date().toISOString(),
      });
      
      // A simple strategy to find a collaborator from the suggested group.
      // This part can be made more robust. For now, it finds the first group mentioned.
      let assignedCollaboratorId: string | null = null;
      for (const group of groups) {
          if (suggestion.suggestedStrategy.toLowerCase().includes(group.name.toLowerCase())) {
              const collaboratorsInGroup = group.collaboratorIds;
              if (collaboratorsInGroup.length > 0) {
                  // Simple round-robin or random choice within the suggested group
                  assignedCollaboratorId = collaboratorsInGroup[Math.floor(Math.random() * collaboratorsInGroup.length)];
                  break; 
              }
          }
      }

      // Fallback: If AI fails or suggestion is unclear, use simple round-robin on all users.
      if (!assignedCollaboratorId) {
          const allCollaboratorIds = collaborators.map(c => c.id);
          if (allCollaboratorIds.length > 0) {
              assignedCollaboratorId = allCollaboratorIds[assignments.length % allCollaboratorIds.length];
          }
      }

      if (assignedCollaboratorId) {
          assignments.push({ leadId: lead.id, collaboratorId: assignedCollaboratorId });
      }
    }

    // 4. Batch write assignments to Firestore
    if (assignments.length > 0) {
      const batch = firestore.batch();
      for (const { leadId, collaboratorId } of assignments) {
        const leadRef = firestore.collection('leads').doc(leadId);
        batch.update(leadRef, { assignedCollaboratorId: collaboratorId });
      }
      await batch.commit();
      distributedCount = assignments.length;
    }

    return { distributedCount };
  }
);
