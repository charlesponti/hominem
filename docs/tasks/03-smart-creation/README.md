---
type: project-index
status: proposed
priority: medium
team: omiro
project: smart-creation-defaults
labels:
  - omiro
  - compose
  - classification
source: ../03-smart-creation.md
---

# Smart Creation Defaults

## Delivery order

1. `SMART-CREATE-00`: approve heuristic-only scope and override semantics.
2. `SMART-CREATE-01`: implement pure draft classification.
3. `SMART-CREATE-02`: connect classification to the adaptive submit control and long-press override.
4. `SMART-CREATE-03`: instrument overrides and verify mobile behavior.

Tier 2 LLM classification is explicitly deferred until Tier 1 override data justifies it. No `/api/classify` endpoint belongs in the initial implementation.
