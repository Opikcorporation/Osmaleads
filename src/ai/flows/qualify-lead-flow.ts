'use server';
/**
 * @fileOverview An AI flow for qualifying and scoring leads based on deterministic rules.
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

// This function now calculates the score based on deterministic rules.
// The AI part is kept for structure and potential future enhancements.
export async function qualifyLead(
  input: QualifyLeadInput
): Promise<QualifyLeadOutput> {
  return qualifyLeadFlow(input);
}


// Function to calculate score based on defined business rules
const calculateScore = (data: Record<string, string>): { score: number, justification: string } => {
  let score = 0;
  const justifications: string[] = [];

  // Question 1: Objective (using the field 'objectif')
  const objectiveValue = data['objectif'];
  if (objectiveValue) {
    if (objectiveValue.includes('Rendement locatif')) {
      score += 7;
      justifications.push("rendement locatif");
    } else if (objectiveValue.includes('Achat/Revente')) {
      score += 5;
       justifications.push("achat/revente");
    } else if (objectiveValue.includes('Résidence')) {
      score += 7;
       justifications.push("résidence principale/secondaire");
    }
  }

  // Question 2: Timeline (using the field 'temps')
  const timelineValue = data['temps'];
  if (timelineValue) {
    if (timelineValue.includes('Immédiatement')) {
      score += 10;
      justifications.push("projet immédiat");
    } else if (timelineValue.includes('1-3 mois')) {
      score += 5;
      justifications.push("projet à court terme");
    } else if (timelineValue.includes('6 mois')) {
      score += 1;
      justifications.push("projet à moyen terme");
    }
  }

  // Question 3: Budget (using the field 'budget')
  const budgetValue = data['budget'];
  if (budgetValue) {
    if (budgetValue.includes('Supérieur à 350.000€')) {
      score += 12;
      justifications.push("budget supérieur");
    } else if (budgetValue.includes('Entre 250.000 et 350.000€')) {
      score += 7;
       justifications.push("budget conséquent");
    } else if (budgetValue.includes('Inférieur à 250.000€')) {
      score += 1;
       justifications.push("budget standard");
    }
  }

  const justification = justifications.length > 0
    ? `Score basé sur: ${justifications.join(', ')}.`
    : 'Score de base, informations de qualification absentes.';

  return { score, justification };
};

const getTier = (score: number): 'Haut de gamme' | 'Moyenne gamme' | 'Bas de gamme' => {
  if (score > 20) return 'Haut de gamme';
  if (score > 10) return 'Moyenne gamme';
  return 'Bas de gamme';
};

const qualifyLeadFlow = ai.defineFlow(
  {
    name: 'qualifyLeadFlow',
    inputSchema: QualifyLeadInputSchema,
    outputSchema: QualifyLeadOutputSchema,
  },
  async (input) => {
    const leadData = JSON.parse(input.leadData) as Record<string, string>;

    // Calculate score using deterministic logic
    const { score, justification } = calculateScore(leadData);

    // Determine tier based on score
    const tier = getTier(score);

    // The output is now based on calculation, not an AI prompt.
    return {
      score,
      tier,
      justification,
    };
  }
);
