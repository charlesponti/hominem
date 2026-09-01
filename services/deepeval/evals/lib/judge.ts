import { OpenRouterModel } from 'deepeval/models';

// deepeval picks its provider from env flags (USE_OPENROUTER_MODEL, etc.) once,
// at import time, before any test code runs - so we can't steer it from here.
// Building the judge model directly like this is the supported way around
// that, letting us pin a specific judge provider/model.
export const judgeModel = new OpenRouterModel({
  model: process.env.DEEPEVAL_JUDGE_MODEL ?? 'openai/gpt-oss-20b',
});
