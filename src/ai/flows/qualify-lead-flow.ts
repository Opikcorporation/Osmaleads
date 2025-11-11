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

const qualificationPrompt = ai.definePrompt({
    name: 'qualifyLeadPrompt',
    input: { schema: QualifyLeadInputSchema },
    output: { schema: QualifyLeadOutputSchema },
    prompt: `
        Tu es un expert en qualification de prospects pour une agence marketing. Ton objectif est d'analyser les réponses d'un prospect et de lui attribuer un score de 0 à 100 en suivant ce barème de notation précis.

        ---
        **BARÈME DE NOTATION**

        **1. Échéance du projet (Poids : 40%)**
        - "Dès que possible" : Excellent (Score maximum pour ce critère)
        - "Dans les 3 prochains mois" : Bon (Score élevé, mais inférieur à "Dès que possible")
        - "Dans 6 mois ou plus" : Moyen (Score faible)
        - "Juste pour information" : Très faible (Score proche de zéro pour ce critère)

        **2. Budget Mensuel (Poids : 40%)**
        - "plus de 5000€" : Excellent
        - "2000€ - 5000€" : Très bon
        - "1000€ - 2000€" : Correct
        - "500€ - 1000€" : Faible
        - "moins de 500€" : Très faible

        **3. Objectif Principal (Poids : 20%)**
        - "Générer plus de prospects" ou "Augmenter les ventes en ligne" : Très Pertinent (Score élevé)
        - "Améliorer l'image de marque (Notoriété)" : Moins Pertinent (Score moyen)
        - Autre chose : À évaluer au cas par cas.

        ---

        **INSTRUCTIONS**

        Analyse les données du prospect ci-dessous. Pèse chaque critère selon le barème, calcule un score global, attribue un tier ('Haut de gamme' > 66, 'Moyenne gamme' > 33) et fournis une justification concise en français.

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
    // AI qualification is currently disabled as requested.
    // Returning default values.
    return {
        score: 0,
        tier: 'Bas de gamme',
        justification: "La qualification IA est désactivée.",
    };
  }
);
