---
name: Migration goal - finance/rocco to notes
description: Goal of migrate-finance-rocco-to-shared-packages change is to eventually delete apps/finance and apps/rocco; apps/notes AI assistant will handle all that functionality
type: project
---

The migrate-finance-rocco-to-shared-packages OpenSpec change is part of a larger plan to DELETE apps/finance and apps/rocco entirely. The apps/notes AI personal assistant will eventually replace all their functionality.

**Why:** Consolidate into a single AI-first app (notes) rather than maintaining multiple standalone apps.

**How to apply:** When migrating components, ensure completeness over convenience — don't leave partial migrations. The target state is that finance-react, places-react, lists-react, and invites-react packages are fully self-contained and apps/finance + apps/rocco can be removed.
