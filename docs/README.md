# Hominem Documentation

This directory contains architecture documentation, implementation guides, and project notes for the Hominem monorepo.

## Primary References

### REST API Architecture
- **[REST_API_MIGRATION_COMPLETE_GUIDE.md](./REST_API_MIGRATION_COMPLETE_GUIDE.md)** - Comprehensive guide covering the complete architectural evolution from Phase 1 through Phase 4, including the pivot from ApiResult wrappers to direct REST responses. **Start here for understanding the current API architecture and decision-making process.**

### RPC Type System (HTTP Bindings)
- **[RPC_TYPE_SYSTEM_COMPLETE_GUIDE.md](./RPC_TYPE_SYSTEM_COMPLETE_GUIDE.md)** - Complete type-safe HTTP bindings system for Hono RPC layer. Covers input derivation from Zod, explicit output types, and alignment with REST-first architecture. **Start here for understanding RPC type strategy.**

## Architecture & Design

- **[ARCHITECTURE_TYPES_FIRST.md](./ARCHITECTURE_TYPES_FIRST.md)** - Type-driven architecture approach for the monorepo

## Implementation Guides

- **[HONO_RPC_MIGRATION_PLAN.md](./HONO_RPC_MIGRATION_PLAN.md)** - Plan for migrating to Hono RPC
- **[ROCCO_HONO_MIGRATION_COMPREHENSIVE.md](./ROCCO_HONO_MIGRATION_COMPREHENSIVE.md)** - Comprehensive guide for Rocco's Hono migration
- **[INVITES_RPC_REFACTOR.md](./INVITES_RPC_REFACTOR.md)** - Refactoring invites service to RPC

## Performance & Optimization

- **[RADICAL_PERFORMANCE_PLAN_COMBINED.md](./RADICAL_PERFORMANCE_PLAN_COMBINED.md)** - Performance optimization strategies
- **[typescript-performance-optimization-guide.md](./typescript-performance-optimization-guide.md)** - TypeScript build and type-checking performance optimization

## Feature Documentation

- **[google-places.md](./google-places.md)** - Google Places API integration
- **[rocco-invite-system.md](./rocco-invite-system.md)** - Rocco invite system design and implementation
- **[fixing-google-profile-images-corb.md](./fixing-google-profile-images-corb.md)** - CORS issue resolution for profile images
- **[florin-analytics-displays.md](./florin-analytics-displays.md)** - Analytics display implementation
- **[place-images-migration.md](./place-images-migration.md)** - Place images migration guide
- **[tanstack-ai.md](./tanstack-ai.md)** - TanStack AI integration

## Project Structure

- **[restructuring.md](./restructuring.md)** - Monorepo restructuring notes

## Archived Documentation

The following documents are preserved for historical reference but have been consolidated into comprehensive guides:

### Archived API Contract Documentation (consolidated into REST_API_MIGRATION_COMPLETE_GUIDE.md)

- **API_CONTRACT_INDEX.md** - Old index
- **API_CONTRACT_PHASE_1.md** - Phase 1 foundations
- **API_CONTRACT_PHASE_2.md** - Phase 2 backend migrations
- **API_CONTRACT_PHASE_3.md** - Phase 3 frontend integration
- **API_CONTRACT_PHASE_4.md** - Phase 4 REST migration
- **API_CONTRACT_QUICKSTART.md** - Quick reference
- **PHASE_4_COMPLETION_REPORT.md** - Phase 4 completion report

### Archived RPC Type Documentation (consolidated into RPC_TYPE_SYSTEM_COMPLETE_GUIDE.md)

- **RPC_TYPE_INDEPENDENCE.md** - RPC type independence patterns
- **RPC_TYPES_FINAL_APPROACH.md** - Final approach for RPC type strategy
- **RPC_TYPES_IMPLEMENTATION.md** - Implementation notes
- **RPC_TYPES_INFERRED_OUTPUTS.md** - Output inference details
- **RPC_TYPES_UTILITIES.md** - JsonSerialized and EmptyInput utilities

---

## Navigation

### By Topic

- **Getting Started:** See [REST_API_MIGRATION_COMPLETE_GUIDE.md](./REST_API_MIGRATION_COMPLETE_GUIDE.md) for the complete REST architecture evolution
- **API Bindings:** See [RPC_TYPE_SYSTEM_COMPLETE_GUIDE.md](./RPC_TYPE_SYSTEM_COMPLETE_GUIDE.md) for type-safe HTTP response types
- **API Error Handling:** See REST_API_MIGRATION_COMPLETE_GUIDE.md, Part 11 for error handling patterns
- **Type Safety:** See [ARCHITECTURE_TYPES_FIRST.md](./ARCHITECTURE_TYPES_FIRST.md) and RPC_TYPE_SYSTEM_COMPLETE_GUIDE.md, Part 10 for type guarantees
- **Performance:** See [RADICAL_PERFORMANCE_PLAN_COMBINED.md](./RADICAL_PERFORMANCE_PLAN_COMBINED.md) and [typescript-performance-optimization-guide.md](./typescript-performance-optimization-guide.md)

### For Different Audiences

- **Developers:** START with REST_API_MIGRATION_COMPLETE_GUIDE.md, then RPC_TYPE_SYSTEM_COMPLETE_GUIDE.md
- **Architecture Team:** Read both comprehensive guides plus ARCHITECTURE_TYPES_FIRST.md
- **New Team Members:** Read REST guide first to understand evolution, then RPC guide for current patterns
- **Prospective Clients/Employers:** Read REST guide (shows decision-making and pragmatism)

## Last Updated

January 27, 2026
