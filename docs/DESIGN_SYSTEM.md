# Ponti VOID Design System (Canonical)

**Status:** Active canonical reference for audits, PR review, and implementation decisions
**Date:** 2026-03-10
**Canonical Sources:**
- [`.github/instructions/design.instructions.md`](/Users/charlesponti/Developer/hominem/.github/instructions/design.instructions.md)
- [`packages/ui/src/styles/globals.css`](/Users/charlesponti/Developer/hominem/packages/ui/src/styles/globals.css)
- [`packages/ui/src/styles/animations.css`](/Users/charlesponti/Developer/hominem/packages/ui/src/styles/animations.css)
- [`packages/ui/tools/stylelint-config-void.cjs`](/Users/charlesponti/Developer/hominem/packages/ui/tools/stylelint-config-void.cjs)

This document merges all active and historical VOID design definitions in one place so design audits can be done against a single source before making app-level changes.

## 00. Source of Truth and Scope

- **Policy source:** `.github/instructions/design.instructions.md`
- **Implementation source:** `packages/ui/src/styles/globals.css` and `packages/ui/src/styles/animations.css`
- **Audit source:** this document plus enforcement checks in `packages/ui/tools/stylelint-config-void.cjs`
- **Migration source:** this document replaces previous fragmented notes and migration guides that describe VOID-to-VOID or VOID-to-unified transitions.

## 01. Philosophy: The Four Pillars

The design system is a constraint-driven aesthetic and operational language.

- **Kanso (簡素 - Simplicity):** Remove non-essential visual surface.
- **Ma (間 - Negative Space):** Use empty space as a structural element.
- **Shibui (渋い - Understated):** Emphasize static, clear data presentation without decorative flourish.
- **Wabi-sabi (侘寂 - Imperfection):** Embrace technical honesty, asymmetry, and non-polished edges where appropriate.

## 02. Color and Surface Principles

VOID remains a monochrome-first system that uses light values for hierarchy.

### Palette Defaults

| Variable | Value | Usage |
| --- | --- | --- |
| `--background` | `#000000` | Base surface |
| `--foreground` | `#FFFFFF` | Primary text |
| `--secondary-foreground` | `rgba(255, 255, 255, 0.7)` | Body text and secondary descriptors |
| `--muted-foreground` | `rgba(255, 255, 255, 0.4)` | Meta text, labels, footer |
| `--muted` | `rgba(255, 255, 255, 0.05)` | Secondary surfaces |
| `--primary` | `#FFFFFF` | Actionable UI states |
| `--destructive` | `#FF0000` | Critical errors |
| `--success` | `rgba(255, 255, 255, 0.7)` | Positive confirmation |
| `--warning` | `#FF8800` | Warning states |
| `--border` | `rgba(255, 255, 255, 0.1)` | Structural boundaries |

**Rule:** prefer tokenized color classes and avoid raw hex/rgba values in app code. Any exception must be documented in a ticket.

## 03. Typography

Monospace is the preferred family by default.

### Font Stack

`Geist Mono`, `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, `monospace`

### Type Rules

- Heading scale should remain compact and intentional.
- `Display 1`: `clamp(2.5rem, 5vw, 6rem)` for section-leading visual hierarchy.
- Headings should typically be uppercase in key callouts.
- Body baseline should remain `text-sm` unless a component requires larger readability.

## 04. Layout and Structure (Fukinsei)

- Do not use rigid 12-column composition as a hard default.
- Introduce asymmetric composition where it improves signal clarity.
- Keep vertical rhythm prominent in dense content areas.
- Recommended structural spacing emphasis includes large separations (e.g., 16rem macro spacing in sparse regions).

## 05. Motion and Interaction

- VOID is primarily static.
- Transitions and hover animations should be restrained.
- Default interactions are instant unless a technical requirement justifies minimal animation.
- Allowed micro-interactions are limited to utility and state clarity.
- Cursor baseline is crosshair for precision-focused interactions.
- Respect reduced motion preferences.

## 06. ASCII Texture and Indicator Layer

When using low-cost signal texture:

- Never exceed opacity `0.20`.
- Default to `0.12` for backgrounds.
- Allowed glyph set: ``+``, ``·``, ``~``, ``-``, ``/``, ``\\``.
- Use sparingly and never on interactive controls.

## 07. Tone of Voice

- Copy is direct, terse, technical, and lowercase/uppercase controlled by component context.
- Prefer imperative and state-focused language.
- Avoid friendly prose, excessive punctuation, and decorative framing.

## 08. Motion Utilities and Components

Use shared utilities from `packages/ui/src/styles/animations.css` and component utilities in `packages/ui/src/styles/globals.css`.

- Prefer canonical component classes from shared UI styles.
- Prefer rectangular geometry over decorative radius unless product context explicitly overrides.
- Prefer opacity and border hierarchy over shadow-heavy depth.

## 09. Cross-Document Mappings (Legacy Merge Notes)

The following earlier references are now merged here:

- Ponti Studios Unified Design System migration examples
- Previous VOID manual language from manual drafts
- App migration mapping tables and troubleshooting notes

Treat contradictory wording in old docs as legacy context only. For current behavior and audit checks, use this canonical doc plus `design.instructions.md`.

## 10. Implementation Checklist for Audits

- [ ] Verify policy source-of-truth references are still aligned.
- [ ] Verify no new raw color literals are introduced in app files.
- [ ] Verify no forbidden visual language is introduced (e.g., decorative gradients, excessive easing, soft shadows where static framing is required).
- [ ] Verify motion utilities come from shared animation primitives.
- [ ] Verify copy and copy tone follow the VOID constraint style.
- [ ] Verify typography and spacing remain intentional for cognitive clarity.

## 11. Command Pointers for Audit

```bash
# Verify core token source
rg -n "@theme|--background|--foreground|--border|--muted" packages/ui/src/styles/globals.css

# Verify app-level VOID constraints against shared standards
rg -n "rounded-|shadow|transition-|animate-|cursor:\s*pointer|transition-all|animate-spin|backdrop-blur" apps/** --glob "*.tsx" --glob "*.ts"

# Check stylelint/VOID enforcement is available
ls packages/ui/tools/stylelint-config-void.cjs
grep -n "cursor|transition|shadow|border-radius" packages/ui/tools/stylelint-config-void.cjs
```

## 12. Migration Index

- [Design migration guide](/Users/charlesponti/Developer/hominem/docs/MIGRATION_GUIDE.md): scoped migration examples for old syntax patterns.
- [Troubleshooting](/Users/charlesponti/Developer/hominem/docs/TROUBLESHOOTING.md): operational debugging and common checks.

