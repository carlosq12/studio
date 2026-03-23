'use server';
/**
 * @fileOverview Summarizes an employee's profile, including skills, tasks, and performance.
 *
 * - summarizeEmployeeData - A function that handles the summarization process.
 * - SummarizeEmployeeDataInput - The input type for the summarizeEmployeeData function.
 * - SummarizeEmployeeDataOutput - The return type for the summarizeEmployeeData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeEmployeeDataInputSchema = z.object({
  employeeName: z.string().describe('The name of the employee to summarize.'),
  skills: z.string().describe('A comma-separated list of the employee\'s skills.'),
  tasks: z.string().describe('A description of the tasks the employee is currently working on.'),
  performance: z.string().describe('A summary of the employee\'s recent performance.'),
});
export type SummarizeEmployeeDataInput = z.infer<typeof SummarizeEmployeeDataInputSchema>;

const SummarizeEmployeeDataOutputSchema = z.object({
  summary: z.string().describe('A summary of the employee\'s profile.'),
});
export type SummarizeEmployeeDataOutput = z.infer<typeof SummarizeEmployeeDataOutputSchema>;

export async function summarizeEmployeeData(input: SummarizeEmployeeDataInput): Promise<SummarizeEmployeeDataOutput> {
  return summarizeEmployeeDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeEmployeeDataPrompt',
  input: {schema: SummarizeEmployeeDataInputSchema},
  output: {schema: SummarizeEmployeeDataOutputSchema},
  prompt: `You are an AI assistant helping managers summarize employee profiles.

  Summarize the following information about the employee:

  Employee Name: {{{employeeName}}}
  Skills: {{{skills}}}
  Tasks: {{{tasks}}}
  Performance: {{{performance}}}

  Provide a concise summary of the employee's profile, highlighting their key strengths and areas for improvement.
  `,
});

const summarizeEmployeeDataFlow = ai.defineFlow(
  {
    name: 'summarizeEmployeeDataFlow',
    inputSchema: SummarizeEmployeeDataInputSchema,
    outputSchema: SummarizeEmployeeDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
