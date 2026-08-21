# DeepEval evaluations

Run the time-block regression suite while iterating on the extraction prompt:

```bash
pnpm --filter @hominem/deepeval eval:time-block-regression
```

Run the held-out release suite only after selecting a prompt/model candidate:

```bash
pnpm --filter @hominem/deepeval eval:time-block-holdout
```

DeepEval uses TypeScript test files under `tests/evals` and runs them through
Vitest:

```bash
pnpm --filter @hominem/deepeval eval:all
```

Each suite lives in its own top-level folder (`offer-extraction/`,
`time-block-extraction/`, etc.) holding the prompt(s), an `assertions.ts`
scoring function, and — for larger suites — a `cases.ts` with the test-case
data. The corresponding `tests/evals/<suite>.test.ts` file wires a suite's
prompt + cases + assertions together into real Vitest tests, calling the
model under test via `tests/evals/lib/openrouter.ts` and, for suites judged by
an LLM rubric instead of a deterministic assertion, scoring with deepeval's
`GEval` metric via `tests/evals/lib/geval.ts`.

Set `OPENROUTER_API_KEY` for both the tested model and the DeepEval judge. The
judge defaults to `google/gemini-2.5-flash-lite`; set `DEEPEVAL_JUDGE_MODEL` to
use another OpenRouter model. Set `DEEPEVAL_TARGET_MODEL` only when overriding
the model a suite's test file selects (an OpenRouter model id, or
`ollama:chat:<model>` to run against a local Ollama server).

Both suites use fixed date/time and timezone context. They score JSON shape,
intent, temporal grounding, duration, participants, and the absence of
invented fields. Do not move a held-out case into the regression suite merely
to improve a prompt's score; add a new regression case only for a confirmed
production failure.
