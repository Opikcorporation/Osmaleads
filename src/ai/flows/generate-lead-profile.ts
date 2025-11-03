'use server';
/**
 * @fileOverview An AI agent that analyzes raw lead data to extract structured information.
 *
 * - generateLeadProfile - The main function to trigger the lead analysis.
 * - GenerateLeadProfileInput - The input type for the function.
 * - GenerateLeadProfileOutput - The return type, containing structured lead info.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define the input schema, which is the raw JSON data of a lead.
const GenerateLeadProfileInputSchema = z.object({
  leadData: z.string().describe('The raw data of a single lead, usually a JSON stringified object from a CSV row.'),
});
export type GenerateLeadProfileInput = z.infer<typeof GenerateLeadProfileInputSchema>;

// Define the output schema for the structured data we want the AI to extract.
const GenerateLeadProfileOutputSchema = z.object({
  name: z.string().describe("The full name of the lead, person, or company. This is the most important field to find."),
  company: z.string().optional().describe("The company name, if available."),
  email: z.string().optional().describe("The email address, if available."),
  phone: z.string().optional().describe("The phone number, if available."),
  username: z.string().optional().describe("A username or social media handle, if available."),
  score: z.number().describe("A score from 0-100 indicating the lead's quality. Analyze all available data to determine this score. A higher score means a better lead."),
});
export type GenerateLeadProfileOutput = z.infer<typeof GenerateLeadProfileOutputSchema>;

// The main function to be called from our application (e.g., an API route).
export async function generateLeadProfile(input: GenerateLeadProfileInput): Promise<GenerateLeadProfileOutput> {
  return generateLeadProfileFlow(input);
}

// Define the prompt for the AI.
const leadAnalysisPrompt = ai.definePrompt({
  name: 'leadAnalysisPrompt',
  input: { schema: GenerateLeadProfileInputSchema },
  output: { schema: GenerateLeadProfileOutputSchema },
  prompt: `
    You are an expert data analyst. Your only task is to analyze the raw data of a single lead (one row from a CSV) and identify which column corresponds to the prospect's **name** and which column corresponds to their **phone number**.

    - **Primary Goal**: Find the 'name' and 'phone' fields.
    - **name**: Look for column headers like "Nom", "Name", "Full Name", "Nom Complet", "Company Name", "Societe". This is the most critical piece of information.
    - **phone**: Look for a column whose value is a sequence of **more than 5 digits**. It may optionally start with a '+' character. This is a very reliable way to identify the phone number.

    Also extract other relevant information if available, like email, company, and username.
    
    Finally, provide a lead quality score from 0-100. Base this on how much information is available. A lead with a name and phone number is a high-quality lead.

    Analyze the following data and return ONLY the structured JSON object with the identified fields.

    Lead Data:
    {{{leadData}}}
  `,
});

// Define the Genkit flow that orchestrates the AI call.
const generateLeadProfileFlow = ai.defineFlow(
  {
    name: 'generateLeadProfileFlow',
    inputSchema: GenerateLeadProfileInputSchema,
    outputSchema: GenerateLeadProfileOutputSchema,
  },
  async (input) => {
    const { output } = await leadAnalysisPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate a lead profile.');
    }
    return output;
  }
);
