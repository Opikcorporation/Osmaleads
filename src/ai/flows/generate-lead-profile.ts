'use server';

/**
 * @fileOverview Generates a comprehensive lead profile from imported data, including a score.
 *
 * - generateLeadProfile - A function that generates the lead profile and score.
 * - GenerateLeadProfileInput - The input type for the generateLeadProfile function.
 * - GenerateLeadProfileOutput - The return type for the generateLeadProfile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { LeadTier } from '@/lib/types';
import { leadTiers } from '@/lib/types';

const GenerateLeadProfileInputSchema = z.object({
  leadData: z
    .string()
    .describe('Lead data in CSV or other text format.'),
});
export type GenerateLeadProfileInput = z.infer<typeof GenerateLeadProfileInputSchema>;

const GenerateLeadProfileOutputSchema = z.object({
  name: z.string().describe("The full name of the lead or company, extracted from the data."),
  company: z.string().optional().describe("The company name, if available."),
  email: z.string().optional().describe("The lead's email, if available."),
  phone: z.string().optional().describe("The lead's phone number, if available."),
  username: z.string().optional().describe("The lead's username or handle, if available."),
  profile: z.string().describe('A comprehensive profile of the lead, summarizing key information, potential interests, and possible pain points.'),
  score: z.number().min(0).max(100).describe('A score from 0 to 100 representing the quality of the lead. 100 is the best possible score.'),
  scoreRationale: z.string().describe('A brief explanation for why the score was given.'),
});
export type GenerateLeadProfileOutput = z.infer<typeof GenerateLeadProfileOutputSchema>;

export async function generateLeadProfile(input: GenerateLeadProfileInput): Promise<GenerateLeadProfileOutput> {
  return generateLeadProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLeadProfilePrompt',
  input: {schema: GenerateLeadProfileInputSchema},
  output: {schema: GenerateLeadProfileOutputSchema},
  prompt: `You are an expert AI assistant for sales teams. Your task is to analyze raw lead data and produce a structured profile.

  1.  **Analyze the data:** Read the provided lead data carefully.
  2.  **Extract Key Information:** Pull out the lead's full name, company name, email, phone number, and username if they are present in the data. If a field is not present, omit it. The 'name' field is the most important; use the company name if a person's name is not available.
  3.  **Generate a Profile:** Create a concise, comprehensive profile summarizing the most important information for a salesperson.
  4.  **Score the Lead:** Based on your analysis, assign a score from 0 to 100. A higher score means a better, more qualified lead. Consider factors like budget, company size, expressed needs, and contact information quality.
  5.  **Justify the Score:** Provide a short, clear rationale for the score you assigned.

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

export async function getTierFromScore(score: number): Promise<LeadTier> {
  if (score >= 80) return 'Haut de gamme';
  if (score >= 50) return 'Moyenne gamme';
  return 'Bas de gamme';
}
