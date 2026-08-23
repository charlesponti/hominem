set dotenv-load := false

speech since='30m':
    "{{ justfile_directory() }}/scripts/diagnose-speech.sh" "{{ since }}"

usage:
    "{{ justfile_directory() }}/scripts/diagnose-usage.sh"

smoke:
    pnpm --filter @hominem/api exec tsx scripts/speech-smoke-test.ts
