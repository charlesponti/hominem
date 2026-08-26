import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import 'deepeval/vitest';
import { EvaluationDataset, Golden } from 'deepeval/dataset';
import { GEval, JsonCorrectnessMetric } from 'deepeval/metrics';
import { SingleTurnParams } from 'deepeval/test-case';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import goldens from '../../datasets/career-job-import/goldens.json';
import { judgeModel } from '../lib/judge';
import { loadJsonPrompt, renderMessages } from '../lib/prompt';
import { runTarget } from '../lib/target';

const suiteDir = resolve(import.meta.dirname, '../../datasets/career-job-import');
const prompt = loadJsonPrompt(resolve(suiteDir, 'prompt.json'));
const dataset = new EvaluationDataset({ goldens: goldens.map((golden) => new Golden(golden)) });
const outputSchema = z
  .object({
    jobTitle: z.string(),
    companyName: z.string(),
    companyDescription: z.string(),
    jobDescription: z.string(),
    location: z.string(),
    salaryRange: z.string(),
    salaryDetails: z.string(),
    employmentType: z.string(),
    experienceLevel: z.string(),
    education: z.string(),
    requirements: z.array(z.string()),
    skills: z.array(z.string()),
    benefits: z.array(z.string()),
    responsibilities: z.array(z.string()),
    industry: z.string(),
    postedDate: z.string(),
    applicationDeadline: z.string(),
    department: z.string(),
    hiringManager: z.string(),
    companySize: z.string(),
    fundingStage: z.string(),
    technologyStack: z.array(z.string()),
    cultureAspects: z.array(z.string()),
    fullText: z.string().min(500),
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
    name: 'Job import correctness',
    evaluationSteps: [
      'Require the correct Whatnot company and AI Tooling Engineer role.',
      'Require fullText and jobDescription to retain the complete job description in source order, not a summary.',
      'Require fields to be grounded only in the supplied posting and leave unavailable fields empty.',
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

describe('career job import', () => {
  for (const golden of dataset.goldens) {
    if (!(golden instanceof Golden)) throw new Error('Job import dataset must be single-turn');
    it(golden.name ?? golden.input, async () => {
      const postingText = readFileSync(resolve(suiteDir, golden.input), 'utf8');
      await expect(golden).toPass(metrics, {
        task: () => runTarget(renderMessages(prompt, { postingText })),
      });
    });
  }
});
