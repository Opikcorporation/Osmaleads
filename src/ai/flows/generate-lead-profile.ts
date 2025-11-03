'use server';

/**
 * @fileOverview Generates a comprehensive lead profile from imported data.
 *
 * - generateLeadProfile - A function that generates the lead profile.
 * - GenerateLeadProfileInput - The input type for the generateLeadProfile function.
 * - GenerateLeadProfileOutput - The return type for the generateLeadProfile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLeadProfileInputSchema = z.object({
  leadData: z
    .string()
    .describe('Lead data in CSV or other text format.'),
});
export type GenerateLeadProfileInput = z.infer<typeof GenerateLeadProfileInputSchema>;

const GenerateLeadProfileOutputSchema = z.object({
  profile: z.string().describe('A comprehensive profile of the lead.'),
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
