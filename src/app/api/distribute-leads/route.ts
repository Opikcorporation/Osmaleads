'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const AssignmentActionSchema = z.object({
  leadId: z.string(),
  collaboratorId: z.string(),
});

const RequestBodySchema = z.object({
  assignments: z.array(AssignmentActionSchema),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = RequestBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.formErrors }, { status: 400 });
    }

    const { assignments } = validation.data;

    if (assignments.length === 0) {
        return NextResponse.json({ message: "No assignments to perform." }, { status: 200 });
    }

    const { firestore } = getFirebaseAdmin();
    const batch = firestore.batch();
    const serverTimestamp = FieldValue.serverTimestamp();

    for (const { leadId, collaboratorId } of assignments) {
      const leadRef = firestore.collection('leads').doc(leadId);
      batch.update(leadRef, {
        assignedCollaboratorId: collaboratorId,
        status: 'New',
        assignedAt: serverTimestamp,
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
