
import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the schema for the AI prompt input
const insightPromptSchema = z.object({
  groupId: z.string(),
  transactionsJson: z.string().describe('A JSON string of group transactions.'),
  membersJson: z.string().describe('A JSON string of group members.'),
});

// Define the schema for the AI prompt output
const insightOutputSchema = z.object({
  insights: z.string().describe("A summary of insights about the group's financial activity."),
  error: z.string().optional().describe("Any error that occurred while generating insights."),
});

// Define the Genkit prompt
const groupInsightsPrompt = ai.definePrompt({
  name: 'groupInsightsPrompt',
  input: { schema: insightPromptSchema },
  output: { schema: insightOutputSchema },
  prompt: `
    You are a financial analyst for a community savings group (a "Mukando"). 
    Your task is to analyze the provided transaction data and member list to generate helpful insights for the group administrator.

    Analyze the following data for group ID {{{groupId}}}:
    - Members: {{{membersJson}}}
    - Transactions: {{{transactionsJson}}}

    Provide a concise, bullet-pointed summary of key insights. Focus on:
    - Contribution patterns (e.g., consistency, average amount).
    - Payout trends (e.g., frequency, average amount).
    - Identify top contributors and members who may be falling behind.
    - Note any unusual activity or potential issues.
    - Keep the language clear, simple, and encouraging.

    If the data is empty or insufficient for analysis, respond with a friendly message stating that more data is needed.
    Format the output as a single string with newline characters (\\n) for breaks.
  `,
});

// Define the Genkit flow
const generateGroupInsightsFlow = ai.defineFlow(
  {
    name: 'generateGroupInsightsFlow',
    inputSchema: insightPromptSchema,
    outputSchema: insightOutputSchema,
  },
  async (input) => {
    try {
      if (!input.transactionsJson || JSON.parse(input.transactionsJson).length === 0) {
        return {
          insights: "There isn't enough transaction data yet to generate insights. Keep recording contributions and payouts!",
        };
      }
      
      const result = await groupInsightsPrompt(input);
      const output = result.output;
      if (!output) {
        throw new Error('No output from AI model');
      }
      return output;
    } catch (error: any) {
      console.error('Error generating group insights:', error);
      return {
        insights: '',
        error: 'Sorry, I was unable to generate insights at this time. Please try again later.',
      };
    }
  }
);


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { groupId, transactionsJson, membersJson } = insightPromptSchema.parse(body);

    const result = await generateGroupInsightsFlow({
      groupId,
      transactionsJson,
      membersJson,
    });
    
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[API/insights] Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
