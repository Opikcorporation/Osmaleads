'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Lead, Group, DistributionSetting } from '@/lib/types';

const RequestBodySchema = z.object({
  groupId: z.string(),
});

/**
 * Calculates how many leads have been assigned to each collaborator today.
 */
async function getTodaysAssignments(firestore: FirebaseFirestore.Firestore): Promise<{ [collaboratorId: string]: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const assignmentsCount: { [collaboratorId: string]: number } = {};
    // Query for leads that have an 'assignedAt' timestamp from today
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


/**
 * API route to distribute unassigned leads to a group of collaborators
 * based on their settings (daily quota, lead tier) using a round-robin strategy.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = RequestBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.formErrors }, { status: 400 });
    }
    
    const { groupId } = validation.data;
    const { firestore } = getFirebaseAdmin();

    // 1. Get Group, its Distribution Setting, and Collaborator members
    const groupSnap = await firestore.collection('groups').doc(groupId).get();
    if (!groupSnap.exists) {
        return NextResponse.json({ error: `Group with ID ${groupId} not found.` }, { status: 404 });
    }
    const group = { ...groupSnap.data(), id: groupSnap.id } as Group;

    const settingsSnap = await firestore.collection('distributionSettings').where('groupId', '==', groupId).limit(1).get();
    if (settingsSnap.empty) {
        return NextResponse.json({ message: "No distribution setting found for this group. Cannot distribute leads." }, { status: 200 });
    }
    const setting = { ...settingsSnap.docs[0].data(), id: settingsSnap.docs[0].id } as DistributionSetting;
    
    const eligibleCollaborators = group.collaboratorIds || [];
    if (eligibleCollaborators.length === 0) {
        return NextResponse.json({ message: "No collaborators in this group to distribute to." }, { status: 200 });
    }

    // 2. Determine how many leads to assign to meet the daily quota
    const todaysAssignments = await getTodaysAssignments(firestore);
    const groupLeadsToday = eligibleCollaborators.reduce((sum, memberId) => sum + (todaysAssignments[memberId] || 0), 0);
    
    let leadsToAssignCount = setting.dailyQuota - groupLeadsToday;
    if (leadsToAssignCount <= 0) {
        return NextResponse.json({ message: `Daily quota of ${setting.dailyQuota} already met for this group today.` }, { status: 200 });
    }

    // 3. Get unassigned leads that match the group's tier criteria
    // CORRECTED: Use `== null` to find documents where the field is null or doesn't exist.
    let unassignedLeadsQuery = firestore.collection('leads').where('assignedCollaboratorId', '==', null);
    if (setting.leadTier !== 'Tous') {
        unassignedLeadsQuery = unassignedLeadsQuery.where('tier', '==', setting.leadTier);
    }
    const unassignedLeadsSnap = await unassignedLeadsQuery.limit(leadsToAssignCount).get();
    const unassignedLeads = unassignedLeadsSnap.docs
      .map(d => ({ ...d.data(), id: d.id } as Lead));

    if (unassignedLeads.length === 0) {
        return NextResponse.json({ message: "No unassigned leads matching the criteria." }, { status: 200 });
    }
    
    // 4. Create round-robin assignment strategy to ensure fair distribution
    const assignments: { leadId: string, collaboratorId: string }[] = [];
    const currentAssignmentsCount = { ...todaysAssignments };
    
    // Sort collaborators by who has the fewest assignments today to start with them
    const sortedEligibleCollaborators = [...eligibleCollaborators].sort((a,b) => (currentAssignmentsCount[a] || 0) - (currentAssignmentsCount[b] || 0));

    let collaboratorIndex = 0;
    for (const lead of unassignedLeads) {
        // Find the next collaborator in the round-robin sequence
        const collaboratorToAssignId = sortedEligibleCollaborators[collaboratorIndex % sortedEligibleCollaborators.length];
        
        assignments.push({ leadId: lead.id, collaboratorId: collaboratorToAssignId });
        
        // Increment the index for the next lead
        collaboratorIndex++;
    }

    if (assignments.length === 0) {
        return NextResponse.json({ message: "No assignments could be made." }, { status: 200 });
    }

    // 5. Execute all assignments in a single atomic batch write
    const batch = firestore.batch();
    const serverTimestamp = FieldValue.serverTimestamp();

    for (const { leadId, collaboratorId } of assignments) {
      const leadRef = firestore.collection('leads').doc(leadId);
      batch.update(leadRef, {
        assignedCollaboratorId: collaboratorId,
        status: 'New',
        assignedAt: serverTimestamp, // Add timestamp for tracking
      });
    }

    await batch.commit();

    return NextResponse.json({
      message: `${assignments.length} lead(s) have been successfully distributed.`,
      distributedCount: assignments.length,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/distribute-leads:', error);
    return NextResponse.json({ error: 'Failed to execute distribution', details: error.message }, { status: 500 });
  }
}
