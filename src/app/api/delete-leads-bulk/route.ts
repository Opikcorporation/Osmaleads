'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const RequestBodySchema = z.object({
  leadIds: z.array(z.string()).min(1, "Au moins un ID de lead est requis."),
});

/**
 * API route to bulk delete leads from Firestore.
 */
export async function POST(request: Request) {
  const { firestore } = getFirebaseAdmin();
  
  try {
    const body = await request.json();
    const validation = RequestBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.formErrors }, { status: 400 });
    }
    
    const { leadIds } = validation.data;
    
    // Firestore write batches are limited to 500 operations.
    // If you expect to delete more, you'll need to chunk the leadIds array.
    if (leadIds.length > 500) {
        return NextResponse.json({ error: 'Vous ne pouvez pas supprimer plus de 500 leads à la fois.'}, { status: 400 });
    }

    const batch = firestore.batch();

    leadIds.forEach(id => {
      const leadRef = firestore.collection('leads').doc(id);
      batch.delete(leadRef);
      // Note: This does not delete subcollections like 'notes'.
      // A more complex solution (e.g., a Cloud Function) would be needed for that.
    });

    await batch.commit();

    return NextResponse.json({
      message: `${leadIds.length} lead(s) ont été supprimés avec succès.`,
      deletedCount: leadIds.length,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/delete-leads-bulk:', error);
    return NextResponse.json({ error: 'Failed to execute lead deletion', details: error.message }, { status: 500 });
  }
}
