'use server';

/**
 * @fileOverview Generates a comprehensive lead profile from imported data, including a score and a tier.
 *
 * - generateLeadProfile - A function that generates the lead profile.
 * - GenerateLeadProfileInput - The input type for the generateLeadProfile function.
 * - GenerateLeadProfileOutput - The return type for the generateLeadProfile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { leadTiers } from '@/lib/types';

const GenerateLeadProfileInputSchema = z.object({
  leadData: z
    .string()
    .describe('Lead data in CSV or other text format.'),
});
export type GenerateLeadProfileInput = z.infer<typeof GenerateLeadProfileInputSchema>;

const GenerateLeadProfileOutputSchema = z.object({
  profile: z.string().describe('A comprehensive profile of the lead.'),
  score: z.number().min(1).max(100).describe('A score from 1 to 100 representing the quality of the lead. A higher score is better.'),
  tier: z.enum(leadTiers).describe('The quality tier of the lead (Bas de gamme, Moyenne gamme, Haut de gamme).'),
});
export type GenerateLeadProfileOutput = z.infer<typeof GenerateLeadProfileOutputSchema>;

export async function generateLeadProfile(input: GenerateLeadProfileInput): Promise<GenerateLeadProfileOutput> {
  return generateLeadProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLeadProfilePrompt',
  input: {schema: GenerateLeadProfileInputSchema},
  output: {schema: GenerateLeadProfileOutputSchema},
  prompt: `You are an AI assistant that specializes in creating lead profiles from imported data. You will receive lead data in CSV or other text format. Analyze the data and generate a comprehensive profile of the lead, including key information, potential interests, and possible pain points.

Based on the lead's information (like budget, company size, urgency), assign a score from 1 to 100. A high score (80+) indicates a high-value lead ready to purchase. A low score (<40) indicates a low-priority lead.

Then, classify the lead into one of these three tiers based on the score: 'Bas de gamme', 'Moyenne gamme', or 'Haut de gamme'.

Lead Data:
{{{leadData}}}`,
});

const generateLeadProfileFlow = ai.defineFlow(
  {
    name: 'generateLeadProfileFlow',
    inputSchema: GenerateLeadProfileInputSchema,
    outputSchema: GenerateLeadProfileOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
