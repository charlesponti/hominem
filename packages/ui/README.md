# @hominem/ui

## Usage
- Import directly from the package:
  - `import { Button, Toaster, useToast } from '@hominem/ui'`
  - `import { Sheet, SheetContent } from '@hominem/ui/components/ui/sheet'`
- Mount `<Toaster />` once near the app root for toast support.

## Tailwind setup
- Components expect the shadcn “new-york” design tokens (`bg-background`, `text-foreground`, etc.) and CSS variables (e.g. `--background`, `--foreground`) to be defined in your global CSS.
- Ensure `tailwindcss-animate` (or equivalent keyframes) is available for the animation utility classes used by toast, accordion, sheet, and dialog.

