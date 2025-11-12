'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { Lead, ScoringRule } from '@/lib/types';
import { qualifyLead } from '@/ai/flows/qualify-lead-flow';

const RequestBodySchema = z.object({
  leadIds: z.array(z.string()).min(1, "Au moins un ID de lead est requis."),
});

/**
 * API route to qualify a batch of leads using the AI flow.
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
    
    // 1. Fetch all leads and all scoring rules in parallel
    const [leadsSnapshot, rulesSnapshot] = await Promise.all([
      firestore.collection('leads').where('__name__', 'in', leadIds).get(),
      firestore.collection('scoringRules').get()
    ]);

    if (leadsSnapshot.empty) {
        return NextResponse.json({ error: 'Aucun des leads spécifiés n\'a été trouvé.' }, { status: 404 });
    }

    // Create a map for quick rule lookup
    const rulesMap = new Map<string, ScoringRule>();
    rulesSnapshot.forEach(doc => {
      const rule = doc.data() as ScoringRule;
      rulesMap.set(rule.zapName, rule);
    });

    // 2. Prepare qualification tasks
    const qualificationPromises = leadsSnapshot.docs.map(async (leadDoc) => {
        const lead = { ...leadDoc.data(), id: leadDoc.id } as Lead;

        // Find the rule for the lead's zapName
        const rule = rulesMap.get(lead.zapName || '');
        if (!rule) {
            console.log(`No scoring rule found for zapName: "${lead.zapName}". Skipping lead ${lead.id}.`);
            return null; // Skip this lead
        }

        // Call the AI flow
        try {
             const result = await qualifyLead({
                leadData: lead.leadData,
                rules: JSON.stringify(rule.rules)
             });
             
             // Return the data needed for the update
             return {
                leadId: lead.id,
                updateData: {
                    score: result.score,
                    tier: result.tier,
                }
             };
        } catch (aiError) {
            console.error(`AI qualification failed for lead ${lead.id}:`, aiError);
            return null; // Skip on AI error
        }
    });

    // 3. Execute all AI qualifications
    const results = await Promise.all(qualificationPromises);
    const validResults = results.filter(Boolean); // Filter out nulls (skipped leads)

    if (validResults.length === 0) {
      return NextResponse.json({ message: 'Aucun lead n\'a pu être qualifié (règles manquantes ou erreur IA).', qualifiedCount: 0 }, { status: 200 });
    }

    // 4. Batch write all updates to Firestore
    const batch = firestore.batch();
    for (const result of validResults) {
        if (result) {
           const leadRef = firestore.collection('leads').doc(result.leadId);
           batch.update(leadRef, result.updateData);
        }
    }

    await batch.commit();

    return NextResponse.json({
      message: `${validResults.length} sur ${leadIds.length} lead(s) ont été qualifiés avec succès.`,
      qualifiedCount: validResults.length,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/qualify-leads-bulk:', error);
    return NextResponse.json({ error: 'Failed to execute lead qualification', details: error.message }, { status: 500 });
  }
}
