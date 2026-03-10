What you’re describing is actually a **very strong and modern design direction**. A **single dark-mode system with subtle off-black tones and off-white foreground** is exactly how a lot of premium developer tools feel today (Linear, Raycast, Vercel dashboards, etc.). The key is to make the dark palette **not pure black**, and to rely on **opacity layers and surface elevation** rather than lots of different colors.

Below is a **complete token set** you could start with for the Ponti Studios ecosystem.

---

# Ponti Studios Dark Design System

## Core Philosophy

- **Single dark theme**
- **Neutral monochrome palette**
- **Off-white foreground**
- **Opacity-based elevation**
- **Minimal accent usage**

Everything should feel **calm, intelligent, and premium**.

---

# Color Tokens

## Backgrounds

These define **depth layers**.

| Token               | Value                    | Usage                   |
| ------------------- | ------------------------ | ----------------------- |
| `color.bg.base`     | `#0F1113`                | App background          |
| `color.bg.surface`  | `#14171A`                | Cards / panels          |
| `color.bg.elevated` | `#1A1E22`                | Modals / hover states   |
| `color.bg.overlay`  | `rgba(255,255,255,0.04)` | Glass / subtle overlays |

The goal is **very small differences in luminance**, not big jumps.

---

## Text Colors

Use **off-white instead of pure white** to reduce eye fatigue.

| Token                  | Value     | Usage           |
| ---------------------- | --------- | --------------- |
| `color.text.primary`   | `#E7EAEE` | Main text       |
| `color.text.secondary` | `#B3BAC2` | Subtext         |
| `color.text.tertiary`  | `#7A828A` | Metadata        |
| `color.text.disabled`  | `#545B62` | Disabled states |

---

## Border / Line Colors

Borders should feel **barely visible**.

| Token                  | Value                    |
| ---------------------- | ------------------------ |
| `color.border.default` | `rgba(255,255,255,0.08)` |
| `color.border.subtle`  | `rgba(255,255,255,0.04)` |
| `color.border.focus`   | `rgba(255,255,255,0.16)` |

---

## Icon / Line Color

| Token                | Value     |
| -------------------- | --------- |
| `color.icon.primary` | `#F5F7FA` |
| `color.icon.muted`   | `#AEB5BD` |

These should match the **icon style you've been generating**.

---

# Texture System (Opacity Layers)

Instead of lots of colors, use **white overlays with opacity**.

| Token            | Value                    | Usage           |
| ---------------- | ------------------------ | --------------- |
| `texture.low`    | `rgba(255,255,255,0.02)` | subtle hover    |
| `texture.medium` | `rgba(255,255,255,0.04)` | cards           |
| `texture.high`   | `rgba(255,255,255,0.08)` | active elements |

This produces the **soft material look** your icons already have.

---

# Accent Colors (Optional)

The base UI stays monochrome, but you can allow **per-app accents**.

| Product | Accent                    |
| ------- | ------------------------- |
| Kuma    | `#F2E7C9` warm ivory      |
| Jinn    | `#CDA6FF` mystical violet |
| Void    | `#7BD3F7` cool blue       |
| Revrock | `#FFB86B` amber           |
| Atlas   | `#8ED1C2` teal            |

These should be used **sparingly**:

- highlights
- graphs
- active states

---

# Typography Tokens

You want something that feels:

- modern
- calm
- developer-friendly
- extremely legible

Best choices:

### Primary Font

```
Inter
```

Why:

- designed for UI
- excellent readability
- great weight range

Token:

```
font.family.primary = "Inter, system-ui, sans-serif"
```

---

### Secondary / Code Font

```
JetBrains Mono
```

Used for:

- code blocks
- terminal
- technical UI

Token:

```
font.family.mono = "JetBrains Mono, monospace"
```

---

# Font Size Scale

Use a **4px rhythm scale**.

| Token               | Size |
| ------------------- | ---- |
| `font.size.xs`      | 12px |
| `font.size.sm`      | 14px |
| `font.size.md`      | 16px |
| `font.size.lg`      | 18px |
| `font.size.xl`      | 20px |
| `font.size.display` | 28px |

---

# Font Weights

| Token                  | Weight |
| ---------------------- | ------ |
| `font.weight.regular`  | 400    |
| `font.weight.medium`   | 500    |
| `font.weight.semibold` | 600    |
| `font.weight.bold`     | 700    |

Most UI should stay between **400–600**.

---

# Spacing Tokens

Use an **8px grid**.

| Token     | Value |
| --------- | ----- |
| `space.1` | 4px   |
| `space.2` | 8px   |
| `space.3` | 12px  |
| `space.4` | 16px  |
| `space.5` | 24px  |
| `space.6` | 32px  |
| `space.7` | 48px  |

---

# Radius Tokens

Your icons already imply **soft rounded corners**.

| Token       | Value |
| ----------- | ----- |
| `radius.sm` | 6px   |
| `radius.md` | 10px  |
| `radius.lg` | 14px  |
| `radius.xl` | 20px  |

App icons:

```
radius.icon = 22%
```

---

# Shadow Tokens

Subtle shadows for elevation.

```
shadow.low = 0 2px 8px rgba(0,0,0,0.35)
shadow.medium = 0 8px 24px rgba(0,0,0,0.45)
shadow.high = 0 20px 60px rgba(0,0,0,0.55)
```

---

# Example Token File

If you were implementing this:

```json
{
  "color": {
    "bg": {
      "base": "#0F1113",
      "surface": "#14171A",
      "elevated": "#1A1E22"
    },
    "text": {
      "primary": "#E7EAEE",
      "secondary": "#B3BAC2",
      "tertiary": "#7A828A"
    },
    "border": {
      "default": "rgba(255,255,255,0.08)",
      "subtle": "rgba(255,255,255,0.04)"
    }
  }
}
```

---

# What Makes This System Strong

This palette will feel:

- **minimal**
- **calm**
- **developer-native**
- **very premium**

And it matches perfectly with the **icon suite we just designed**.

---

If you'd like, I can also show you **one trick that will make the Ponti Studios UI feel insanely polished**: a **three-layer material system** used by Apple and Linear that gives dark interfaces subtle depth without adding color.
