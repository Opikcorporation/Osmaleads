'use server';
/**
 * @fileOverview An AI flow for qualifying and scoring leads.
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

export async function qualifyLead(
  input: QualifyLeadInput
): Promise<QualifyLeadOutput> {
  return qualifyLeadFlow(input);
}

const prompt = ai.definePrompt({
  name: 'qualifyLeadPrompt',
  input: {schema: QualifyLeadInputSchema},
  output: {schema: QualifyLeadOutputSchema},
  prompt: `You are an expert B2B lead qualification analyst. Your task is to analyze the data of a new lead and assign it a score and a tier based on its potential value.

You will be given a JSON object containing the lead's information. Analyze all the fields provided (like 'company_name', 'job_title', 'estimated_budget', etc.) to make your assessment.

- A high score (e.g., 70-100) is for leads that look very promising: clear budget, decision-maker role, relevant industry.
- A medium score (e.g., 40-69) is for leads with some potential but missing key information.
- A low score (e.g., 0-39) is for leads that seem unqualified, have very little information, or are clearly not a good fit.

Based on the score, determine the tier:
- Score > 66: 'Haut de gamme'
- Score > 33: 'Moyenne gamme'
- Otherwise: 'Bas de gamme'

Provide a brief, one-sentence justification in French for your decision.

Here is the lead data to analyze:
{{{leadData}}}
`,
});

const qualifyLeadFlow = ai.defineFlow(
  {
    name: 'qualifyLeadFlow',
    inputSchema: QualifyLeadInputSchema,
    outputSchema: QualifyLeadOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
