JOB_IMPORT_BENCHMARK_URL := 'https://jobs.ashbyhq.com/whatnot/7cfa0536-94de-42b7-9fe7-d646f4addc29?utm_source=LinkedInJobWrapping'
JOB_IMPORT_BENCHMARK_INPUT := '/tmp/hominem-career-job-import.html'
JOB_IMPORT_BENCHMARK_OUTPUT := '/tmp/hominem-career-job-import.json'

# Fetch the fixture and benchmark the production career-import model.
benchmark-job-import:
    @set -euo pipefail; \
    curl --fail --silent --show-error --location --user-agent 'PontiCareerBenchmark/1.0' '{{JOB_IMPORT_BENCHMARK_URL}}' --output '{{JOB_IMPORT_BENCHMARK_INPUT}}'; \
    trap 'rm -f "{{JOB_IMPORT_BENCHMARK_INPUT}}"' EXIT; \
    set -a; source '{{ justfile_directory() }}/services/api/.env'; set +a; \
    timeout --signal=TERM 90s pnpm dlx promptfoo@latest eval --config '{{ justfile_directory() }}/services/promptfoo/career-job-import/config.yaml' --no-cache --max-concurrency 1 --output '{{JOB_IMPORT_BENCHMARK_OUTPUT}}'; \
    echo 'Results: {{JOB_IMPORT_BENCHMARK_OUTPUT}}'

view-job-import-benchmark:
    pnpm dlx promptfoo@latest view
