import { OpenRouterModel } from 'deepeval/models';

// deepeval's env-flag provider selection (USE_OPENROUTER_MODEL, etc.) resolves
// once, at import time, before any test file's own code can run — so it can't
// be steered from here. Building the judge model explicitly sidesteps that
// entirely and is the supported way to pin a specific judge provider/model.
export const judgeModel = new OpenRouterModel({
  model: process.env.DEEPEVAL_JUDGE_MODEL ?? 'qwen/qwen3-30b-a3b-instruct-2507',
});
