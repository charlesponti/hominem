---
applyTo: 'apps/finance/**'
---

---
applyTo: 'apps/finance/**'
---

# Florin Analytics Displays (UI Contract)

UI guidelines for analytics components used in Florin dashboards. Canonical UI and accessibility guidance lives in `react.instructions.md`.

Key rules:
- Provide clear loading/error/empty states for every display.
- Use `formatCurrency` for all monetary values and consistent color tokens for positive/negative values.
- Desktop: tables; Mobile: stacked cards. Charts must be responsive and accessible.

Verification:
- Visual smoke tests for key routes: `/analytics`, `/budget`, `/finance/runway`.
- Unit tests for `formatCurrency` edge cases.
