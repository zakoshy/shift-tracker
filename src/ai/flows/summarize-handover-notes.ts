'use server';
/**
 * @fileOverview A Genkit flow for summarizing staff handover and departure notes.
 *
 * - summarizeHandoverNotes - A function that processes an array of handover notes
 *                            and generates a summary, key themes, critical issues,
 *                            overall sentiment, and staff well-being trends.
 * - SummarizeHandoverNotesInput - The input type for the summarizeHandoverNotes function.
 * - SummarizeHandoverNotesOutput - The return type for the summarizeHandoverNotes function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SummarizeHandoverNotesInputSchema = z.object({
  handoverNotes: z.array(z.string()).describe('An array of individual staff handover and departure notes.'),
  startDate: z.string().optional().describe('The start date for the period of notes (e.g., YYYY-MM-DD), for contextual reference.'),
  endDate: z.string().optional().describe('The end date for the period of notes (e.g., YYYY-MM-DD), for contextual reference.'),
});
export type SummarizeHandoverNotesInput = z.infer<typeof SummarizeHandoverNotesInputSchema>;

const SummarizeHandoverNotesOutputSchema = z.object({
  summary: z.string().describe('A high-level summary of all combined handover notes.'),
  keyThemes: z.array(z.string()).describe('A list of prominent themes and recurring topics identified across the notes.'),
  criticalIssues: z.array(z.string()).describe('A list of critical or urgent issues that require immediate attention.'),
  overallSentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']).describe('The overall sentiment expressed in the notes (e.g., positive, neutral, negative, mixed).'),
  staffWellbeingTrends: z.array(z.string()).describe('Any observable trends or patterns related to staff well-being, burnout, or stress levels.'),
});
export type SummarizeHandoverNotesOutput = z.infer<typeof SummarizeHandoverNotesOutputSchema>;

export async function summarizeHandoverNotes(input: SummarizeHandoverNotesInput): Promise<SummarizeHandoverNotesOutput> {
  return summarizeHandoverNotesFlow(input);
}

const summarizeHandoverNotesPrompt = ai.definePrompt({
  name: 'summarizeHandoverNotesPrompt',
  input: { schema: SummarizeHandoverNotesInputSchema },
  output: { schema: SummarizeHandoverNotesOutputSchema },
  prompt: `You are an expert healthcare operations analyst. Your task is to review a collection of staff handover and departure notes for a healthcare organization.

Analyze the provided notes to identify:
1. A concise, high-level summary of all notes.
2. Key themes and recurring topics.
3. Any critical or urgent issues.
4. The overall sentiment expressed (e.g., positive, neutral, negative, mixed).
5. Trends related to staff well-being or potential burnout.

Provide your analysis in a structured JSON format.

Date Range: {{#if startDate}}{{{startDate}}} to {{/if}}{{#if endDate}}{{{endDate}}}{{else}}Today{{/if}}

Notes:
{{#each handoverNotes}}
- {{{this}}}
{{/each}}
`,
});

const summarizeHandoverNotesFlow = ai.defineFlow(
  {
    name: 'summarizeHandoverNotesFlow',
    inputSchema: SummarizeHandoverNotesInputSchema,
    outputSchema: SummarizeHandoverNotesOutputSchema,
  },
  async (input) => {
    const { output } = await summarizeHandoverNotesPrompt(input);
    if (!output) {
      throw new Error('Failed to summarize handover notes.');
    }
    return output;
  }
);
