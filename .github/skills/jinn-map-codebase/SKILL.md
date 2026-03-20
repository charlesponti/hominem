---
name: jinn-map-codebase
description: Use when exploring an unfamiliar codebase — to understand its structure, trace how data flows, or answer 'where do I start if I need to change X?'
license: MIT
compatibility: Works with any project.
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Engineering
  tags: [codebase, exploration, architecture, mapping]
---

Map an unfamiliar codebase to understand its structure and where to start.

Work through these steps in order. Don't skip to reading random files — orient first.

## Steps

### 1. Find the entry points

Start with the edges of the system — where does execution begin?
- **Web apps**: framework router file, `main.*`, `server.*`, `app.*`, `index.*`
- **CLIs**: `cli.*`, `cmd/`, `bin/` directory, `main.go` / `main.ts`
- **Libraries**: `index.*`, `lib/`, `src/` — look for what is exported
- **Services**: service registration, worker entrypoints, cron definitions

Read the `package.json`, `Makefile`, `pyproject.toml`, or equivalent first. The `scripts` section tells you the intended commands; the `main` / `exports` field tells you what external consumers see.

### 2. Trace from entry outward

Follow imports from the entry points:
- What does the entry point depend on? What do those modules depend on?
- Where are the major subsystems? (auth, data access, business logic, presentation, background jobs)
- What are the boundaries between subsystems? (interfaces, service layers, explicit API contracts)
- Which parts are tightly coupled and which are isolated?

Don't read every file — trace the shape of the graph, then read deeply only where the question requires it.

### 3. Map the data flow

Trace a representative user action or data event end-to-end:

```
Input arrives → validated → processed → stored → response returned
```

For each step, identify: which file handles it, which function, and what it produces. One well-chosen trace teaches more than reading 20 unrelated files.

### 4. Locate the test infrastructure
- Where do tests live? (co-located vs. `tests/` vs. `__tests__/`)
- What runner and assertion libraries are used?
- What fixtures and factories exist?
- What coverage gaps are obvious from the structure alone?

Tests are the most honest documentation. Read a few to understand the expected behavior of the most important parts.

### 5. Produce the architecture summary

```
## Architecture Summary

**Entry points**: [file paths]
**Major subsystems**: [name + responsibility + key file(s)]
**Data flow**: [one sentence tracing the critical path]
**External dependencies**: [services, databases, APIs this system talks to]
**Test coverage**: [where coverage is strong, where it's absent]
**To change X, start at**: [specific file or function]
```

## Warning Signals

| Signal | What it means |
|---|---|
| Large files (1000+ lines) | Likely a God class — understand it before touching it |
| Deep import chains | Tight coupling — a change here ripples far |
| No tests for a subsystem | High risk area — add tests before changing |
| Multiple implementations of the same concept | Historical drift — identify the canonical one |
| Comments like "don't change this" | Load-bearing code that isn't well-understood — investigate first |

## Guardrails
- Do not start making changes until the architecture summary is complete.
- Do not read files randomly — orient top-down from entry points.
- The map is done when someone unfamiliar with the codebase can answer "where do I start?" in under 30 seconds.
