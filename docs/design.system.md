# VOID: Design System Manual v1.0

## 00. Philosophy: The Four Pillars

The VOID design system is not a collection of components, but a manifestation of aesthetic constraints. It is an "amoralist" approach to UI—efficient, cold, and undeniably precise.

Kanso (簡素 - Simplicity): Elimination of the non-essential. If a pixel does not serve a functional purpose, it is a distraction.

Ma (間 - Negative Space): The "void" is a structural element. Space is used to enforce focus and respect the user's cognitive load.

Shibui (渋い - Understated): Minimal animations; only ASCII. No decorative gradients. The beauty lies in the static presence of raw data.

Wabi-sabi (侘寂 - Imperfection): Technical honesty. Asymmetry. Asynchronous patterns that reflect the "glitch" in the system rather than corporate perfection.

## 01. Color Palette (The Monochrome Mandate)

We do not use color to evoke emotion. We use light to indicate state.

### Core Surface

| Variable | Value | Usage |
| --- | --- | --- |
| `--background` | `#000000` | The absolute foundation. No exceptions. |
| `--muted` | `rgba(255, 255, 255, 0.05)` | Secondary surfaces, containers, or subtle depth. |

### Typography & Icons

| Variable | Value | Usage |
| --- | --- | --- |
| `--foreground` | `#FFFFFF` | Primary text and high-importance headers. |
| `--secondary-foreground` | `rgba(255, 255, 255, 0.7)` | Body text and secondary descriptors. |
| `--muted-foreground` | `rgba(255, 255, 255, 0.4)` | Meta-data, labels, and footer elements. |

### Technical Indicators

| Variable | Value | Usage |
| --- | --- | --- |
| `--primary` | `#FFFFFF` | Actionable elements (Buttons, Checkboxes). |
| `--destructive` | `#FF0000` | Critical errors or system failures. Pure technical red. |
| `--border` | `rgba(255, 255, 255, 0.1)` | Structural divisions only. |

## 02. Typography System

Monospace is the only allowed classification. It represents the rawest form of digital communication—the terminal.

**Primary stack:** `Geist Mono`, `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, `monospace`.

### Scale

- **Display 1:** `clamp(2.5rem, 5vw, 6rem)` — Reserved for primary branding and section starts.
- **Heading:** Always uppercase. Always tracking-tighter.
- **Body:** `text-sm` (14px). Leading should be generous (relaxed) to allow for Ma.

## 03. Layout & Structure (Fukinsei)

We reject the 12-column rigid grid. We embrace intentional asymmetry.

Vertical Rhythm: Use massive spacing (--spacing-ma-xl: 16rem) to separate distinct thoughts.

Alignment: Left-aligned by default. Right-alignment is used for technical meta-data only.

Borders: 1px solid at 10% opacity. Never use shadows or depth effects.

## 04. Motion & Interaction

VOID is a static system.

Animations: Forbidden. No transition-all. No ease-in-out.

Transitions: Forbidden. State changes (hover/active) must be instantaneous.

Cursor: crosshair is the default to remind the user of the precision required for interaction.

## 05. The ASCII Texture (Wabi-sabi)

To prevent the UI from feeling "dead," we introduce low-opacity ASCII textures. These represent the "Signal in the Void"—transient patterns that suggest the system is alive without utilizing high-compute graphical assets.

Opacity: Never exceed 0.20.

Characters: `+`, `·`, `~`, `-`, `/`, `\\`.

Logic: Patterns should be generated algorithmically, not as static images.

## 06. Tone of Voice

The copy should be direct, cold, and efficient.

### Examples

- **Correct:** ` [ADD_TO_CART] `  
- **Incorrect:** `Would you like to buy this?`

- **Correct:** `THE PACKAGE WILL ARRIVE WHEN THE LOGISTICS PERMIT.`  
- **Incorrect:** `We're working hard to get your order to you!`
