ROOT_DIR := justfile_directory()
ENV_FILE := ROOT_DIR / "services/api/.env"
JOB_IMPORT_FIXTURE := ROOT_DIR / "services/deepeval/datasets/career-job-import/fixtures/whatnot-ashby-posting.html"
JOB_IMPORT_ORG := "whatnot"
JOB_IMPORT_POSTING_ID := "7cfa0536-94de-42b7-9fe7-d646f4addc29"

_run suite:
    #!/usr/bin/env bash
    set -euo pipefail
    set -a; source '{{ ENV_FILE }}'; set +a
    pnpm --filter @hominem/deepeval "eval:{{ suite }}"

# Run every eval suite.
all: (_run "all")

# Run one suite by name — see the recipes below for available names.
run suite: (_run suite)

# Persona/tone rubric — does the assistant hold its blunt, direct voice?
chat-assistant: (_run "chat-assistant")

# Offer-comparison NL extraction — currency, equity, filing status, location inference.
offer-extraction: (_run "offer-extraction")

# Chat-transcript task extraction — discriminates real commitments from vague musing.
task-extraction: (_run "task-extraction")

# Voice transcript cleanup — filler removal without losing meaning.
voice-cleanup: (_run "voice-cleanup")

# Voice task extraction — priority/due-date inference, run across prompt candidates v1-v3.
voice-task-extraction: (_run "voice-task-extraction")

# Time-block extraction — intent, temporal grounding, no-invention. Iterate here.
time-block-regression: (_run "time-block-regression")

# Time-block extraction — held-out release gate. Run only after selecting a prompt/model candidate.
time-block-holdout: (_run "time-block-holdout")

# MCP tool selection — does the model call get_career_portfolio only when appropriate?
mcp-tool-selection: (_run "mcp-tool-selection")

# Career job-import extraction against the checked-in Whatnot/Ashby fixture.
career-job-import: (_run "career-job-import")

# Typecheck every prompt, Golden dataset, and test file.
typecheck:
    pnpm --filter @hominem/deepeval typecheck

# Refresh the checked-in Whatnot job-posting fixture from the live Ashby posting.
refresh-job-import-fixture:
    node '{{ ROOT_DIR }}/just/refresh-job-import-fixture.mjs' '{{ JOB_IMPORT_ORG }}' '{{ JOB_IMPORT_POSTING_ID }}' '{{ JOB_IMPORT_FIXTURE }}'
