# Apple Human Interface Design System Spec

This specification defines the core primitives for a design system modeled after Apple’s Human Interface Guidelines (HIG).

## 1. Typography (SF Pro Strategy)

Apple uses a "dynamic" type system. For web, ensure you use the system font stack to trigger **SF Pro**.

|                 |          |            |                 |                    |
| --------------- | -------- | ---------- | --------------- | ------------------ |
| **Category**    | **Size** | **Weight** | **Line Height** | **Letter Spacing** |
| **Large Title** | 34px     | Bold       | 41px            | 0.37px             |
| **Title 1**     | 28px     | Semibold   | 34px            | 0.36px             |
| **Title 2**     | 22px     | Semibold   | 28px            | 0.35px             |
| **Title 3**     | 20px     | Regular    | 25px            | 0.38px             |
| **Headline**    | 17px     | Semibold   | 22px            | -0.41px            |
| **Body**        | 17px     | Regular    | 22px            | -0.41px            |
| **Callout**     | 16px     | Regular    | 21px            | -0.32px            |
| **Subheadline** | 15px     | Regular    | 20px            | -0.24px            |
| **Footnote**    | 13px     | Regular    | 18px            | -0.08px            |
| **Caption 1**   | 12px     | Regular    | 16px            | 0.0px              |

**Pro Tip:** In Dark Mode, increase letter spacing (tracking) by roughly 1-2% for small text to prevent "ink bleed."

## 2. Adaptive Color Palette (Semantic)

Apple uses functional names so that the UI adapts automatically.

### Backgrounds

|                       |                |               |                             |
| --------------------- | -------------- | ------------- | --------------------------- |
| **Name**              | **Light Mode** | **Dark Mode** | **Usage**                   |
| `SystemBackground`    | `#FFFFFF`      | `#1C1C1E`     | Primary view background     |
| `SecondaryBackground` | `#F2F2F7`      | `#2C2C2E`     | Card grouping / Inset lists |
| `TertiaryBackground`  | `#FFFFFF`      | `#3A3A3C`     | Elements inside cards       |

### Text (Labels)

|                   |                 |                 |                        |
| ----------------- | --------------- | --------------- | ---------------------- |
| **Name**          | **Light Mode**  | **Dark Mode**   | **Usage**              |
| `Label`           | `#000000`       | `#FFFFFF`       | Primary headings/body  |
| `SecondaryLabel`  | `#3C3C43` (60%) | `#EBEBF5` (60%) | Subtitles/Descriptions |
| `TertiaryLabel`   | `#3C3C43` (30%) | `#EBEBF5` (30%) | Placeholder text       |
| `QuaternaryLabel` | `#3C3C43` (18%) | `#EBEBF5` (18%) | Disabled text          |

### System Tints

|               |                |               |
| ------------- | -------------- | ------------- |
| **Name**      | **Light Mode** | **Dark Mode** |
| `SystemBlue`  | `#007AFF`      | `#0A84FF`     |
| `SystemRed`   | `#FF3B30`      | `#FF453A`     |
| `SystemGreen` | `#34C759`      | `#30D158`     |

## 3. Spacing & Layout

Apple uses an **8pt Grid** system for structural spacing and a **4pt Grid** for micro-adjustments.

|             |           |                                   |
| ----------- | --------- | --------------------------------- |
| **Token**   | **Value** | **Usage**                         |
| `Space-XXS` | 4px       | Small icon-text gap               |
| `Space-XS`  | 8px       | Inner padding of small elements   |
| `Space-S`   | 12px      | Padding between elements in a row |
| `Space-M`   | 16px      | Standard gutter/margin            |
| `Space-L`   | 24px      | Vertical section spacing          |
| `Space-XL`  | 32px      | Large hero margins                |

## 4. Corner Radius

Apple uses "Continuous Curves" (Squircular). While difficult to replicate perfectly in CSS without `clip-path`, these values get close:

|                      |                       |
| -------------------- | --------------------- |
| **Element Type**     | **Radius**            |
| **Buttons**          | 10px - 12px           |
| **Standard Cards**   | 16px - 20px           |
| **Large Containers** | 24px - 32px           |
| **App Icons**        | 22.37% of side length |

## 5. Shadows & Depth

In Light Mode, depth is created by shadows. In Dark Mode, depth is created by light.

### Light Mode Shadows

- **Level 1 (Buttons):** `0 1px 3px rgba(0,0,0,0.1)`
- **Level 2 (Cards):** `0 4px 12px rgba(0,0,0,0.08)`
- **Level 3 (Modals):** `0 12px 40px rgba(0,0,0,0.15)`

### Dark Mode Elevation

Shadows are nearly invisible. Instead, change the background color:

- **Surface:** `#1C1C1E`
- **Elevated Card:** `#2C2C2E`
- **Floating Modal:** `#3A3A3C`

## 6. Interaction States

- **Hover (Desktop):** Elements should become slightly darker (Light Mode) or lighter (Dark Mode) by 5%.
- **Active/Pressed:** Reduce opacity to `0.7` or scale down slightly to `0.97`.
- **Focus Ring:** `2px solid #007AFF` with a `2px` offset.
