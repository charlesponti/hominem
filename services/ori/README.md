# Ori evaluations

This service contains parallel Ori versions of the nine evaluation suites in
`services/deepeval`. The original DeepEval service remains unchanged while the
results are compared.

The datasets under `data/` are versioned snapshots. Keep regression and holdout
fixtures separate, and add confirmed production failures to regression data
without moving holdout cases.

Run the discovery check without spending model credits:

```bash
pnpm --filter @hominem/ori eval:list
```

Run one suite with the incumbent target model:

```bash
pnpm --filter @hominem/ori eval:time-block-regression
```

Run all suites:

```bash
pnpm --filter @hominem/ori eval:all
```

Set `ORI_TARGET_MODEL` to compare another target and `ORI_JUDGE_MODEL` to
override the pinned judge. They default to `openai/gpt-4o-mini` and the low-cost
Qwen judge `qwen/qwen3-30b-a3b-instruct-2507`, respectively.

Run the comparison through OpenRouter:

```bash
pnpm --filter @hominem/ori eval:chat-assistant
```

Use the pilot command before a full run to measure expected spend. Eval runs
make real model calls and can spend credits:

```bash
pnpm --filter @hominem/ori eval:pilot
```

The MCP suite uses a dedicated Ori harness that preserves the five Hominem
tool definitions, simulated results, multi-turn limit, tool ordering, and
completion checks.
