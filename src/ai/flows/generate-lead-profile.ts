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
    You are an expert data analyst. Your task is to analyze the raw data of a single lead and extract key information into a structured format.
    The input data is a JSON object representing a row from a CSV or text file. The keys are the original column headers, which can be messy (e.g., "col_1", "Téléphone", "E-mail").

    Your goal is to intelligently map these messy keys to the following standard fields: name, company, email, phone, username, and score.

    - **name**: This is the most critical field. Look for keys like "Nom", "Name", "Full Name", "Nom Complet", "Company Name", "Societe". This should be the primary identifier for the lead.
    - **company**: If a separate company name is identifiable, extract it. Often, it might be the same as the name.
    - **email**: Look for keys like "Email", "Courriel", "E-mail".
    - **phone**: Look for keys like "Phone", "Téléphone", "Mobile".
    - **username**: Look for keys like "Username", "user", "handle".
    - **score**: Provide a lead quality score from 0-100. Base this on the quantity and quality of information available. For example, a lead with a name, email, and phone number is higher quality than one with just a name.

    Analyze the following data and return ONLY the structured JSON object.

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
