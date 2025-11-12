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
  rules: z.string().describe('A JSON string of the scoring rules to apply.')
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

const qualificationPrompt = ai.definePrompt({
    name: 'qualifyLeadPrompt',
    input: { schema: QualifyLeadInputSchema },
    output: { schema: QualifyLeadOutputSchema },
    prompt: `
        Tu es un expert en qualification de prospects. Ton objectif est d'analyser les réponses d'un prospect et de lui attribuer un score de 0 à 100 en suivant un barème de notation.

        Le barème de notation t'est fourni au format JSON. Chaque clé est une question, et chaque valeur est un objet où les clés sont les réponses possibles et les valeurs sont les points à attribuer.

        Calcule le score total en additionnant les points pour chaque réponse du prospect. Le score final doit être normalisé sur 100.
        Si aucune règle ne correspond, le score est 0.

        ---
        **BARÈME DE NOTATION (JSON)**
        {{{rules}}}
        ---

        **INSTRUCTIONS**

        1.  Analyse les données du prospect ci-dessous.
        2.  Applique le barème de notation pour calculer le score.
        3.  Normalise le score sur 100 (le score max possible est la somme de tous les points max par question).
        4.  Attribue un tier ('Haut de gamme' > 66, 'Moyenne gamme' > 33, 'Bas de gamme' <= 33).
        5.  Fournis une justification concise en une phrase en français.

        Données du prospect :
        {{{leadData}}}
    `,
});


const qualifyLeadFlow = ai.defineFlow(
  {
    name: 'qualifyLeadFlow',
    inputSchema: QualifyLeadInputSchema,
    outputSchema: QualifyLeadOutputSchema,
  },
  async (input) => {
    const { output } = await qualificationPrompt(input);
    return output!;
  }
);
