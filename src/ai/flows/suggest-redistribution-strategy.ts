'use server';

/**
 * @fileOverview An AI agent that suggests optimal lead redistribution strategies.
 *
 * - suggestRedistributionStrategy - A function that suggests a lead redistribution strategy.
 * - SuggestRedistributionStrategyInput - The input type for the suggestRedistributionStrategy function.
 * - SuggestRedistributionStrategyOutput - The return type for the suggestRedistributionStrategy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRedistributionStrategyInputSchema = z.object({
  leadProfile: z
    .string()
    .describe('Detailed profile of the lead, including contact information, demographics, and engagement history.'),
  groupPerformanceData: z
    .string()
    .describe(
      'Data on the performance of different groups, including conversion rates, average lead handling time, and success metrics.'
    ),
  currentTime: z
    .string()
    .describe(
      'The current time, which may influence the optimal redistribution strategy (e.g., time of day, day of week).'
    ),
});
export type SuggestRedistributionStrategyInput = z.infer<
  typeof SuggestRedistributionStrategyInputSchema
>;

const SuggestRedistributionStrategyOutputSchema = z.object({
  suggestedStrategy: z
    .string()
    .describe(
      'A detailed redistribution strategy, including which groups or individuals should receive the lead and the rationale behind the suggestion.'
    ),
  rationale: z
    .string()
    .describe(
      'The reasoning behind the suggested strategy, based on the lead profile, group performance data, and current time.'
    ),
});
export type SuggestRedistributionStrategyOutput = z.infer<
  typeof SuggestRedistributionStrategyOutputSchema
>;

export async function suggestRedistributionStrategy(
  input: SuggestRedistributionStrategyInput
): Promise<SuggestRedistributionStrategyOutput> {
  return suggestRedistributionStrategyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRedistributionStrategyPrompt',
  input: {schema: SuggestRedistributionStrategyInputSchema},
  output: {schema: SuggestRedistributionStrategyOutputSchema},
  prompt: `You are an AI assistant designed to suggest optimal lead redistribution strategies for sales teams.

  Analyze the provided lead profile, group performance data, and current time to determine the best course of action.

  Lead Profile: {{{leadProfile}}}
  Group Performance Data: {{{groupPerformanceData}}}
  Current Time: {{{currentTime}}}

  Based on this information, suggest a redistribution strategy that maximizes lead conversion rates.
  Provide a clear rationale for your suggestion.

  Ensure that the outputted JSON is valid.`,
});

const suggestRedistributionStrategyFlow = ai.defineFlow(
  {
    name: 'suggestRedistributionStrategyFlow',
    inputSchema: SuggestRedistributionStrategyInputSchema,
    outputSchema: SuggestRedistributionStrategyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
