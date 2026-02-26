# @hackefeller/type-audit

Portable TypeScript type-performance auditing CLI.

## Usage

```bash
npx @hackefeller/type-audit --project /path/to/project --threshold 1.0 --json /tmp/type-audit.json
```

Or install globally:

```bash
npm i -g @hackefeller/type-audit
type-audit --project /path/to/project
```

## Flags

- `--project <path>`: Project root to audit (default: current directory)
- `--threshold <seconds>`: Slow-file threshold in seconds (default: `1.0`)
- `--json <file>`: Write JSON summary report
- `--trace-dir <path>`: Trace output directory (default: `<project>/.type-analysis`)
- `--compiler <binary>`: Override TypeScript compiler command
- `--max-projects <n>`: Limit discovered `tsconfig.json` targets
- `--memory-mb <n>`: `NODE_OPTIONS --max-old-space-size` value for tsc runs

## Additional Commands

- `npx @hackefeller/type-audit tsserver --logfile <path>`
- `npx @hackefeller/type-audit compare --baseline <file> --current <file>`
- `npx @hackefeller/type-audit dashboard --input <audit.json> --output <dashboard.html>`

## Exit Codes

- `0`: Audit completed with no slow files
- `1`: Audit completed with slow files above threshold
- `2`: Critical compiler failures detected (OOM or recursion limit)
- `10`: CLI/runtime failure

## Publish

```bash
npm publish --workspace @hackefeller/type-audit --access public --provenance
```
