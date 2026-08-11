---
type: project-index
status: proposed
priority: high
team: platform
project: cross-linking
labels:
  - database
  - api
  - omiro
  - chat
  - notes
source: ../02-cross-linking.md
---

# Cross-Linking

## Delivery order

1. `CROSS-LINK-00`: approve link lifecycle and creation semantics.
2. `CROSS-LINK-01`: add the additive database table, repository DTOs, and queries.
3. `CROSS-LINK-02`: expose link endpoints and optional inbox/detail metadata.
4. `CROSS-LINK-03`: implement Save as note and Discuss client flows.
5. `CROSS-LINK-04`: render inbox indicators and detail banners.
6. `CROSS-LINK-05`: verify both directions, orphan handling, and deep links.

Run the repository database migration and generated-type workflow for schema work. Do not manually edit generated database types.
