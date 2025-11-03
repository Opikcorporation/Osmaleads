'use server';
/**
 * @fileOverview An AI agent that scores a batch of real estate leads based on specific criteria.
 *
 * - scoreLead - A function that analyzes a list of lead data and returns a list of scores.
 * - ScoreLeadInput - The input type for the scoreLead function.
 * - ScoreLeadOutput - The return type for the scoreLead function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Lead } from '@/lib/types';

// Input is now an array of leads
const ScoreLeadInputSchema = z.object({
  leads: z.array(z.object({
    id: z.string(),
    leadData: z.string().describe('A JSON string representing the raw data of a single lead from a CSV file.'),
  })).describe('An array of leads to be scored.'),
});
export type ScoreLeadInput = z.infer<typeof ScoreLeadInputSchema>;

// Output is an array of scored leads
const ScoreLeadOutputSchema = z.object({
  scores: z.array(z.object({
    leadId: z.string().describe('The original ID of the lead.'),
    score: z.number().min(0).max(100).describe('A score from 0-100 indicating the quality of the lead.'),
  })).describe('An array of objects, each containing a leadId and its corresponding score.'),
});
export type ScoreLeadOutput = z.infer<typeof ScoreLeadOutputSchema>;


export async function scoreLead(input: ScoreLeadInput): Promise<ScoreLeadOutput> {
  return scoreLeadFlow(input);
}

const scoringPrompt = ai.definePrompt({
  name: 'scoringPrompt',
  input: { schema: ScoreLeadInputSchema },
  output: { schema: ScoreLeadOutputSchema },
  prompt: `You are an expert real estate lead analyst specializing in the Dubai market. Your task is to score a batch of leads based on the raw data provided. For each lead, the score must be between 0 and 100.

  Here are the rules for scoring:
  1.  **Context**: The lead is for real estate in Dubai.
  2.  **Budget**: A higher budget is better. Look for values in Euros (€). A budget over 500,000€ is very good. A budget under 100,000€ is poor.
  3.  **Property Type**: A 'villa' is the best, an 'appartement' is good, and a 'studio' is okay. Score them accordingly.
  4.  **Timeline**: Urgency is key. 'prochainement' (soon) or 'immediatement' (immediately) are the highest quality. '3 mois' (3 months) is medium quality. '+6 mois' (6+ months) is lower quality.

  Analyze the following JSON array of leads. For each lead, return its original 'id' as 'leadId' and the calculated 'score'.

  Leads Data:
  {{{json leads}}}
  `,
});


const scoreLeadFlow = ai.defineFlow(
  {
    name: 'scoreLeadFlow',
    inputSchema: ScoreLeadInputSchema,
    outputSchema: ScoreLeadOutputSchema,
  },
  async (input) => {
    // If there are no leads, return an empty array to avoid calling the AI.
    if (input.leads.length === 0) {
      return { scores: [] };
    }
    
    const { output } = await scoringPrompt(input);
    return output!;
  }
);
