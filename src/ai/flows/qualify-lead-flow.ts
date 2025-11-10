'use server';
/**
 * @fileOverview An AI flow for qualifying and scoring leads based on deterministic rules.
 *
 * - qualifyLead - A function that handles the lead qualification process.
 * - QualifyLeadInput - The input type for the qualifyLead function.
 * - QualifyLeadOutput - The return type for the qualifyLead function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const QualifyLeadInputSchema = z.object({
  leadData: z
    .string()
    .describe(
      'A JSON string representing the raw data of a lead. This could come from a form, a CSV file, or an API like Meta.'
    ),
});
export type QualifyLeadInput = z.infer<typeof QualifyLeadInputSchema>;

const QualifyLeadOutputSchema = z.object({
  score: z
    .number()
    .describe(
      'A numerical score from 0 to 100 representing the quality of the lead. A higher score means a better lead.'
    ),
  tier: z
    .enum(['Haut de gamme', 'Moyenne gamme', 'Bas de gamme'])
    .describe(
      'The quality tier of the lead, determined by its score. >66 is Haut de gamme, >33 is Moyenne gamme, otherwise Bas de gamme.'
    ),
  justification: z
    .string()
    .describe(
        'A brief, one-sentence justification for the assigned score and tier, written in French.'
    ),
});
export type QualifyLeadOutput = z.infer<typeof QualifyLeadOutputSchema>;

// This function now calculates the score based on deterministic rules.
// The AI part is kept for structure and potential future enhancements.
export async function qualifyLead(
  input: QualifyLeadInput
): Promise<QualifyLeadOutput> {
  return qualifyLeadFlow(input);
}


// Function to calculate score based on defined business rules
const calculateScore = (data: Record<string, string>): { score: number, justification: string } => {
  let score = 0;
  // Scoring is temporarily disabled as requested by the user.
  // We will re-enable this later.
  return { score, justification: "Scoring en attente." };
};

const getTier = (score: number): 'Haut de gamme' | 'Moyenne gamme' | 'Bas de gamme' => {
  // Scoring is temporarily disabled.
  return 'Bas de gamme';
};

const qualifyLeadFlow = ai.defineFlow(
  {
    name: 'qualifyLeadFlow',
    inputSchema: QualifyLeadInputSchema,
    outputSchema: QualifyLeadOutputSchema,
  },
  async (input) => {
    let leadData: Record<string, string> = {};
    try {
        leadData = JSON.parse(input.leadData);
    } catch (e) {
        console.error("Could not parse leadData JSON", e);
        // Return a default low-quality score if data is unparsable
        return {
            score: 0,
            tier: 'Bas de gamme',
            justification: 'Données du prospect invalides ou illisibles.',
        };
    }

    // Calculate score using deterministic logic
    const { score, justification } = calculateScore(leadData);

    // Determine tier based on score
    const tier = getTier(score);

    // The output is now based on calculation, not an AI prompt.
    return {
      score,
      tier,
      justification,
    };
  }
);
