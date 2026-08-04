---
title: "Phase 1: CSV parsing (pure)"
order: 1
phase: core-engine
status: ready
depends_on: []
blocked_by_decisions: []
area: backend
---

# Phase 1 — CSV parsing (pure)

## Why this is phase 1, not "part of the worker"

This must be a plain function — `parseCsv(buffer) -> ParsedFile | ParseFailure` — with no BullMQ, Redis, or HTTP involved, so it can be unit tested directly against fixture files. It gets called by the worker later (phase 2, task `07`), but it's designed and proven correct here, first.

## Location

New module, e.g. `packages/finance/src/import/parse-csv.ts`. Built on `csv-parse` (already a dependency — `packages/finance/package.json:24`, `^5.6.0`). The upload is hard-capped by task `05`; phase 1 deliberately returns a bounded `ParsedFile` so account resolution can see the complete file. Internal parser iteration may be streaming, but the public contract is not an unbounded iterator.

## Work

1. Streaming parse via `csv-parse`.
2. Header alias resolution: map varying bank-export column names to canonical fields (`postedOn`, `description`, `amount`, debit/credit columns if separate, and an account-identifier column if present — see task `02`).
3. Row-level validation/normalization: parse dates, parse amounts (see edge cases below), emit a `ParsedRow` (see `../architecture.md` §3.2) or a per-row validation failure.
4. Whole-file failure path distinct from per-row failures (see edge cases).

## Edge cases / gotchas

- **Encoding**: BOM markers, non-UTF-8 encodings (Windows-1252 common from US banks) — detect/strip BOM, consider a fallback decode path.
- **Preamble/footer rows**: some exports include summary rows before the real header row, or trailing footer rows — locate the actual header row rather than assuming row 1.
- **Amount formatting**: parenthesized negatives (`(123.45)`), thousands-separator commas (`1,234.56`), currency symbols, separate debit/credit columns (sign derivation) — not just `parseFloat`.
- **Line endings**: CRLF vs LF — verify with real fixtures.
- **Duplicate/blank headers**: guard against silent field overwrites.
- **Malformed-file vs. invalid-row distinction**: a completely broken/non-CSV file (wrong encoding entirely, an Excel file renamed `.csv`) must fail the **whole parse** immediately with a clear top-level error — not produce 30,000 per-row failures. Per-row invalid data increments an invalid-row count and appends a capped (e.g. 50-entry) reason list.
- **`total` for progress**: streaming means row count isn't known until the whole file is read. Decide: a cheap pre-count pass for an exact `total`, or byte-read percentage as a progress proxy, backfilling the real row count once parsing completes. Document the choice here since task `07` (worker) needs to implement it consistently.

## Parsing contract decision

Use a bounded whole-file parse: `parseCsv(buffer) -> ParsedFile | ParseFailure`, where `ParsedFile` contains normalized rows, capped invalid-row details, and the source metadata needed to derive account fingerprints. The upload limit must be sized so this is safe for the supported ~30,000-row file. Use the parsed row count as `stats.total`; no byte-based progress proxy is needed.

## Testing (do this now, not later)

Build a fixture set under e.g. `packages/finance/src/import/__fixtures__/`: a Chase-style export, an Amex-style export, a generic/simple CSV, a file with parenthesized negatives and thousands separators, a file with a BOM, a file with preamble rows, and at least one deliberately malformed/non-CSV file. Unit test `parseCsv` against every fixture directly — no DB, no server, no upload needed to run these tests.
