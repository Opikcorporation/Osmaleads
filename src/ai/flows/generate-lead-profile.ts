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
  name: z.string().describe("The full name of the lead or company, extracted from the data. This is the most important field. Make a best guess and do not leave it empty."),
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
  prompt: `You are an expert AI assistant for sales teams, specialized in parsing and analyzing lead data from various text formats, especially CSV.

Your task is to analyze the raw text data below and produce a structured profile.

1.  **Analyze the Data Format:** The data is likely a CSV, but could be tab-separated or just unstructured text. Identify the structure. If it's a CSV, identify the header row to understand the columns (e.g., "Full Name", "Email", "Company", etc.).
2.  **Extract Key Information:** Based on the structure, extract the following information. Be resilient to different header names.
    *   **name (Crucial):** Find the lead's full name or a company name. This is the most important field. Look for columns like 'Name', 'Full Name', 'Nom Complet', 'Company', 'Company Name', 'Societe'. This field **must not be empty**. Make a best effort guess.
    *   **company:** Find the company name if it's different from the main lead name.
    *   **email:** Find the contact email.
    *   **phone:** Find the phone number.
    *   **username:** Find any social media handle or username.
3.  **Generate a Comprehensive Profile:** Write a concise summary of the most important information for a salesperson. Include key details from the data, potential interests, and possible pain points.
4.  **Score the Lead:** Assign a score from 0 to 100. A higher score means a better, more qualified lead. Consider factors like the completeness of contact information, budget (if mentioned), company size, expressed needs, etc.
5.  **Justify the Score:** Provide a short, clear rationale for the score you assigned.

The data you need to analyze is below. Do NOT use the filename as a source of information. All information must be extracted from the content itself.

Lead Data:
\`\`\`
{{{leadData}}}
\`\`\`
`,
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
