import { z } from 'zod';

export const DecisionSchema = z.object({
  decision: z.string().describe('Decision made in the text'),
  alternatives: z.array(z.string()).describe('possible positive alternatives'),
  reasoning: z.string().describe('Reasoning behind the decision'),
  context: z.string().describe('Context in which the decision was made'),
});

export const DecisionsSchema = z.array(DecisionSchema).describe('Decisions made in the text');
export type Decisions = z.infer<typeof DecisionsSchema>;
