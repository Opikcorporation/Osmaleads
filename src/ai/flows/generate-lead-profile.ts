'use server';

/**
 * @fileOverview Generates a comprehensive lead profile from imported data, including a score.
 * This flow is designed to process a file containing multiple leads (e.g., a CSV).
 *
 * - generateLeadProfile - A function that generates profiles for all leads in the data.
 * - GenerateLeadProfileInput - The input type for the generateLeadProfile function.
 * - GenerateLeadProfileOutput - The output type, which is an array of lead profiles.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { LeadTier } from '@/lib/types';

// This schema represents a SINGLE lead profile.
const LeadProfileSchema = z.object({
  name: z.string().describe("The full name of the lead or company, extracted from the data. This is the most important field. Make a best guess and do not leave it empty."),
  company: z.string().optional().describe("The company name, if available."),
  email: z.string().optional().describe("The lead's email, if available."),
  phone: z.string().optional().describe("The lead's phone number, if available."),
  username: z.string().optional().describe("The lead's username or handle, if available."),
  profile: z.string().describe('A comprehensive profile of the lead, summarizing key information, potential interests, and possible pain points.'),
  score: z.number().min(0).max(100).describe('A score from 0 to 100 representing the quality of the lead. 100 is the best possible score.'),
  scoreRationale: z.string().describe('A brief explanation for why the score was given.'),
});


const GenerateLeadProfileInputSchema = z.object({
  leadData: z
    .string()
    .describe('A text file, typically CSV, containing one or more leads, one per row.'),
});
export type GenerateLeadProfileInput = z.infer<typeof GenerateLeadProfileInputSchema>;

// The output is now an array of the single lead profile schema.
const GenerateLeadProfileOutputSchema = z.array(LeadProfileSchema);
export type GenerateLeadProfileOutput = z.infer<typeof GenerateLeadProfileOutputSchema>;


export async function generateLeadProfile(input: GenerateLeadProfileInput): Promise<GenerateLeadProfileOutput> {
  return generateLeadProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLeadProfilePrompt',
  input: {schema: GenerateLeadProfileInputSchema},
  output: {schema: GenerateLeadProfileOutputSchema},
  prompt: `You are an expert AI assistant for sales teams, specialized in parsing and analyzing lead data from various text formats, especially CSV.

Your task is to analyze the raw text data below, which contains one or more leads, and produce a structured JSON array of profiles. Each object in the array should represent a single lead.

1.  **Analyze the Data Format:** The data is likely a CSV, but could be tab-separated or pipe-separated. Identify the structure.
2.  **Identify the Header:** The first row is the header. Use it to understand the columns (e.g., "Full Name", "Email", "Company", "Budget", "Notes").
3.  **Process Each Row:** Iterate through each row of data (starting from the second row). Each row is a separate lead.
4.  **For each lead (row), extract the following information:**
    *   **name (Crucial):** Find the lead's full name or a company name. This is the most important field. Look for columns like 'Name', 'Full Name', 'Nom Complet', 'Company', 'Company Name', 'Societe'. This field **must not be empty**.
    *   **company:** Find the company name if it's different from the main lead name.
    *   **email:** Find the contact email.
    *   **phone:** Find the phone number.
    *   **username:** Find any social media handle or username.
    *   **Generate a Comprehensive Profile:** Write a concise summary of the most important information for a salesperson for this specific lead.
    *   **Score the Lead:** Assign a score from 0 to 100. A higher score means a better, more qualified lead. Consider factors like completeness of contact information, budget, company size, expressed needs, etc.
    *   **Justify the Score:** Provide a short, clear rationale for the score.
5.  **Return a JSON Array:** Your final output MUST be a JSON array, where each object conforms to the lead profile structure.

The data you need to analyze is below:

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
    // The output from the prompt is already an array if the schema is z.array()
    return output || [];
  }
);

export async function getTierFromScore(score: number): Promise<LeadTier> {
  if (score >= 80) return 'Haut de gamme';
  if (score >= 50) return 'Moyenne gamme';
  return 'Bas de gamme';
}
