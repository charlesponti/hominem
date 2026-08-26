# DeepEval evaluations

Run the time-block regression suite while iterating on the extraction prompt:

```bash
pnpm --filter @hominem/deepeval eval:time-block-regression
```

Run the held-out release suite only after selecting a prompt/model candidate:

```bash
pnpm --filter @hominem/deepeval eval:time-block-holdout
```

The existing extraction suites use TypeScript test files under
`evals/suites/` and run them through Vitest:

```bash
pnpm --filter @hominem/deepeval eval:all
```

Each suite has a dedicated directory under `datasets/` containing prompt(s)
and versioned `goldens.json` data. The corresponding
`evals/suites/<suite>.test.ts` file uses DeepEval `Golden`,
`EvaluationDataset`, native metrics, and Vitest's `expect(golden).toPass(...)`.
The only shared code is target invocation, prompt rendering, and the judge
model; no suite has custom assertion or scoring code.

Set `OPENROUTER_API_KEY` for both the tested model and the DeepEval judge. All
suites evaluate `openai/gpt-4o-mini` as the target model. The judge defaults to
`google/gemini-2.5-flash-lite`; set `DEEPEVAL_JUDGE_MODEL` to use another
OpenRouter model.

The MCP suite is a native DeepEval traced run: it records agent, LLM, and tool
spans and evaluates task completion, step efficiency, and tool correctness.
Run it locally with:

```bash
just evals mcp-tool-selection
```

The TypeScript runner stores native test traces locally. Inspect the latest
local run without a Confident AI account or subscription:

```bash
pnpm --filter @hominem/deepeval exec deepeval inspect
```

The extraction suites use fixed date/time and timezone context. They score JSON
shape, intent, temporal grounding, duration, participants, and the absence of
invented fields. Do not move a held-out case into the regression suite merely
to improve a prompt's score; add a new regression case only for a confirmed
production failure.
To compare another OpenRouter target without changing the baseline, set
`DEEPEVAL_TARGET_MODEL` for the run:

```sh
DEEPEVAL_TARGET_MODEL=deepseek/deepseek-v4-flash just evals all
```

Enable OpenRouter reasoning for models that support it:

```sh
DEEPEVAL_TARGET_MODEL=deepseek/deepseek-v4-flash \
DEEPEVAL_TARGET_REASONING=high just evals all
```

The judge model remains controlled separately by `DEEPEVAL_JUDGE_MODEL`.
