// Use server directive.
'use server';

/**
 * @fileOverview AI-powered tag suggestion for questions.
 *
 * This file exports:
 * - `suggestTags`: A function to suggest relevant tags for a question.
 * - `SuggestTagsInput`: The input type for the `suggestTags` function.
 * - `SuggestTagsOutput`: The output type for the `suggestTags` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTagsInputSchema = z.object({
  title: z.string().describe('The title of the question.'),
  description: z.string().describe('The description of the question.'),
});
export type SuggestTagsInput = z.infer<typeof SuggestTagsInputSchema>;

const SuggestTagsOutputSchema = z.object({
  tags: z.array(z.string()).describe('An array of suggested tags for the question.'),
});
export type SuggestTagsOutput = z.infer<typeof SuggestTagsOutputSchema>;

export async function suggestTags(input: SuggestTagsInput): Promise<SuggestTagsOutput> {
  return suggestTagsFlow(input);
}

const tagSuggestionTool = ai.defineTool({
  name: 'generateTags',
  description: 'This tool generates relevant tags for a given question based on its title and description.',
  inputSchema: z.object({
    title: z.string().describe('The title of the question.'),
    description: z.string().describe('The description of the question.'),
  }),
  outputSchema: z.array(z.string()).describe('An array of suggested tags'),
},
async (input) => {
  const {title, description} = input;
    // Simple tag generation logic, can be replaced with more sophisticated methods
    const combinedText = `${title} ${description}`.toLowerCase();
    const words = combinedText.split(/\s+/);
    const tags = Array.from(new Set(words.filter(word => word.length > 2))); // Remove duplicates and short words
    return tags;
});

const suggestTagsPrompt = ai.definePrompt({
  name: 'suggestTagsPrompt',
  tools: [tagSuggestionTool],
  input: {schema: SuggestTagsInputSchema},
  output: {schema: SuggestTagsOutputSchema},
  prompt: `You are an expert at suggesting tags for questions.

  Given the title and description of a question, suggest relevant tags that can help categorize the question and make it discoverable by others.
  Use the generateTags tool to generate the tags.
  
  Title: {{{title}}}
  Description: {{{description}}}
  
  Your suggested tags:`, 
});

const suggestTagsFlow = ai.defineFlow(
  {
    name: 'suggestTagsFlow',
    inputSchema: SuggestTagsInputSchema,
    outputSchema: SuggestTagsOutputSchema,
  },
  async input => {
    const {output} = await suggestTagsPrompt(input);
    return {
      tags: output?.tags ?? [],
    };
  }
);
