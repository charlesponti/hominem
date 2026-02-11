# VOID Quickstart (Elite Japanese Minimalism)

## Use These
- Palette: `--background`, `--foreground`, `--border`, `--muted`, `--primary`, `--destructive` (+ opacity steps 90/70/40/20/10%).
- Type: monospace only; max 3 sizes per view; headings uppercase with fixed tracking; weight 400.
- Spacing: Ma tokens only — 16rem / 8rem / 4rem / 2rem for section rhythm.
- Borders: 1px `--border`; no shadows/gradients/blur.
- Motion: shared breezy wave (`void-anim-*`), amplitude ≤4px, 320ms entry or 1800ms loop; honor `prefers-reduced-motion`.
- Texture: ASCII on large backgrounds/empty states only; default opacity 0.12; never on controls.
- Copy: command tone (`UPLOAD`, `STATUS: PENDING`, `REQUEST FAILED. RETRY.`).
- Focus: 2px solid `--foreground`; crosshair cursor; keyboard-first.

## Avoid These
- Friendly words (“please”, “thanks”, “welcome”, “enjoy”), exclamation points, emojis.
- Gradients, shadows, glass blur, rounded corners, extra accent colors.
- Ad-hoc animations/keyframes/transitions outside shared styles; looping decoration on static surfaces.
- Dense micro-spacing; decorative icons without labels; texture on data tables or controls.

## Patterns
- Buttons: rectangle, two sizes; variants primary/ghost/destructive; icon-only must include text or `aria-label`.
- Forms: stacked labels, generous vertical gaps; inline validation in cold tone; disable submit until valid.
- Tables: left-align text, right-align numbers/meta; zebra via opacity steps; include short text summary.
- Dialogs: border + padding; no elevation; allow asymmetric padding to keep Wabi-sabi.

## Review Checklist (quick)
- Tokens only; no raw hex/rgba beyond palette steps.
- Ma spacing tokens present; no stray small gaps.
- Breezy-only motion; `prefers-reduced-motion` works.
- ASCII opacity ≤ token; applied only to backgrounds/empty states.
- Cold copy; focus visible; WCAG AA contrast verified.
