import { resolve } from 'node:path';

import 'deepeval/vitest';
import { EvaluationDataset, Golden } from 'deepeval/dataset';
import { GEval, JsonCorrectnessMetric } from 'deepeval/metrics';
import { SingleTurnParams } from 'deepeval/test-case';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import goldens from '../../datasets/offer-extraction/goldens.json';
import { judgeModel } from '../lib/judge';
import { loadTextPrompt, render } from '../lib/prompt';
import { runTarget } from '../lib/target';

const prompt = loadTextPrompt(
  resolve(import.meta.dirname, '../../datasets/offer-extraction/prompt.md'),
);
const dataset = new EvaluationDataset({ goldens: goldens.map((golden) => new Golden(golden)) });
const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();
const nullableBoolean = z.boolean().nullable();
const offerSchema = z
  .object({
    baseSalary: nullableNumber,
    currency: nullableString,
    currencyAmbiguous: z.boolean(),
    location: nullableString,
    hasEquity: nullableBoolean,
    equityType: nullableString,
    equityValue: nullableNumber,
    equityGrantTotal: nullableNumber,
    equityVestingYears: nullableNumber,
    equityCliff: nullableNumber,
    equityVestingFrequency: nullableString,
    hasBonus: nullableBoolean,
    bonusTargetPct: nullableNumber,
    bonusFrequency: nullableString,
    hasRelocation: nullableBoolean,
    relocationAllowance: nullableNumber,
    relocationCurrency: nullableString,
    requiresVisa: nullableBoolean,
    visaType: nullableString,
    employerCoversVisa: nullableBoolean,
    startDate: nullableString,
    employmentType: z.enum(['employee', 'contractor']).nullable(),
  })
  .strict();
const outputSchema = z
  .object({
    offers: z.array(offerSchema),
    person: z
      .object({
        homeCity: nullableString,
        filingStatus: nullableString,
        currentSavings: nullableNumber,
        currentRetirement: nullableNumber,
        currentMonthlySpend: nullableNumber,
        petCount: nullableNumber,
      })
      .strict(),
  })
  .strict();
const metrics = [
  new JsonCorrectnessMetric({
    expectedSchema: outputSchema,
    threshold: 1,
    includeReason: false,
    model: judgeModel,
  }),
  new GEval({
    name: 'Offer extraction correctness',
    evaluationSteps: [
      'Compare actual output to expected output and source notes semantically, ignoring JSON field order.',
      'Require every stated compensation, currency, location, equity, bonus, visa, relocation, employment, and profile fact.',
      'Require responsible currency inference and explicit ambiguity only for direct contradiction.',
      'Penalize omissions, invented values, incorrect nulls, or merging multiple offers.',
    ],
    evaluationParams: [
      SingleTurnParams.INPUT,
      SingleTurnParams.ACTUAL_OUTPUT,
      SingleTurnParams.EXPECTED_OUTPUT,
    ],
    model: judgeModel,
    threshold: 0.7,
  }),
];

describe('offer extraction', () => {
  for (const golden of dataset.goldens) {
    if (!(golden instanceof Golden)) throw new Error('Offer dataset must be single-turn');
    it(golden.name ?? golden.input, async () => {
      await expect(golden).toPass(metrics, {
        task: (testCase) =>
          runTarget([{ role: 'user', content: render(prompt, { notes: testCase.input }) }]),
      });
    });
  }
});
