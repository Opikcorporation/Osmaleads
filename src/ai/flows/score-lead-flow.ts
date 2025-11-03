'use server';
/**
 * @fileOverview An AI agent that scores a real estate lead based on specific criteria.
 *
 * - scoreLead - A function that analyzes lead data and returns a score.
 * - ScoreLeadInput - The input type for the scoreLead function.
 * - ScoreLeadOutput - The return type for the scoreLead function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ScoreLeadInputSchema = z.object({
  leadData: z.string().describe('A JSON string representing the raw data of a single lead from a CSV file. It contains various properties about the lead.'),
});
export type ScoreLeadInput = z.infer<typeof ScoreLeadInputSchema>;

const ScoreLeadOutputSchema = z.object({
  score: z.number().min(0).max(100).describe('A score from 0-100 indicating the quality of the lead.'),
});
export type ScoreLeadOutput = z.infer<typeof ScoreLeadOutputSchema>;

export async function scoreLead(input: ScoreLeadInput): Promise<ScoreLeadOutput> {
  return scoreLeadFlow(input);
}

const scoringPrompt = ai.definePrompt({
  name: 'scoringPrompt',
  input: { schema: ScoreLeadInputSchema },
  output: { schema: ScoreLeadOutputSchema },
  prompt: `You are an expert real estate lead analyst specializing in the Dubai market. Your task is to score a lead based on the raw data provided. The score must be between 0 and 100.

  Here are the rules for scoring:
  1.  **Context**: The lead is for real estate in Dubai.
  2.  **Budget**: A higher budget is better. Look for values in Euros (€). A budget over 500,000€ is very good. A budget under 100,000€ is poor.
  3.  **Property Type**: A 'villa' is the best, an 'appartement' is good, and a 'studio' is okay. Score them accordingly.
  4.  **Timeline**: Urgency is key. 'prochainement' (soon) or 'immediatement' (immediately) are the highest quality. '3 mois' (3 months) is medium quality. '+6 mois' (6+ months) is lower quality.

  Analyze the following lead data and return ONLY a score.

  Lead Data:
  {{{leadData}}}
  `,
});

const scoreLeadFlow = ai.defineFlow(
  {
    name: 'scoreLeadFlow',
    inputSchema: ScoreLeadInputSchema,
    outputSchema: ScoreLeadOutputSchema,
  },
  async (input) => {
    const { output } = await scoringPrompt(input);
    return output!;
  }
);
