# Promptfoo evaluations

Run the time-block regression suite while iterating on the extraction prompt:

```bash
pnpm exec promptfoo eval -c services/promptfoo/time-block-extraction.config.yaml --no-cache
```

Run the held-out release suite only after selecting a prompt/model candidate:

```bash
pnpm exec promptfoo eval -c services/promptfoo/time-block-extraction-holdout.config.yaml --no-cache
```

Both suites use fixed date/time and timezone context. They score JSON shape,
intent, temporal grounding, duration, participants, and the absence of
invented fields. Do not move a held-out case into the regression suite merely
to improve a prompt's score; add a new regression case only for a confirmed
production failure.
