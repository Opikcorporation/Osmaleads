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

const qualificationPrompt = ai.definePrompt({
    name: 'qualifyLeadPrompt',
    input: { schema: QualifyLeadInputSchema },
    output: { schema: QualifyLeadOutputSchema },
    prompt: `
        You are an expert in lead qualification for a marketing agency. Your goal is to analyze a prospect's answers and assign a score from 0 to 100.

        Here is the ideal prospect profile (highest score):
        - Objective: "Générer plus de prospects" or "Augmenter les ventes en ligne". An objective of "Notoriété" is a lower priority.
        - Budget: A monthly budget of "2000€ - 5000€" or "plus de 5000€" is excellent. A budget of "moins de 500€" is very low.
        - Timeline: A project that needs to start "Dès que possible" or "Dans les 3 prochains mois" is a high priority.

        Analyze the prospect's data below. Assign a score, a tier ('Haut de gamme', 'Moyenne gamme', 'Bas de gamme' based on the score >66, >33), and a one-sentence justification.

        Prospect Data:
        {{{leadData}}}
    `,
});


const qualifyLeadFlow = ai.defineFlow(
  {
    name: 'qualifyLeadFlow',
    inputSchema: QualifyLeadInputSchema,
    outputSchema: QualifyLeadOutputSchema,
  },
  async (input) => {
    let leadDataJson: Record<string, string> = {};
    try {
        leadDataJson = JSON.parse(input.leadData);
    } catch (e) {
        console.error("Could not parse leadData JSON", e);
        return {
            score: 0,
            tier: 'Bas de gamme',
            justification: 'Données du prospect invalides ou illisibles.',
        };
    }
    
    // Use the AI prompt to get the qualification
    const { output } = await qualificationPrompt(input);
    
    if (!output) {
         return {
            score: 0,
            tier: 'Bas de gamme',
            justification: "L'IA n'a pas pu qualifier ce prospect.",
        };
    }

    return output;
  }
);
