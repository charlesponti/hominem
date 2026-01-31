# Schema Analysis Learnings

## Schema Manifest Analysis Complete

### Key Findings
- **32 schema files** confirmed (exact match with previous session)
- **63 pgTable exports** verified (includes all table, enum, and junction tables)
- **5 root schemas** with zero dependencies: activity, company, health, shared, users
- **users.schema.ts** is the critical hub imported by 27/32 schemas (85% of non-root schemas)

### Schema Dependency Patterns
1. **User-centric architecture**: Nearly all schemas depend on users table for tenant isolation
2. **Secondary hubs**: items, company, places, contacts imported by 3+ schemas each
3. **Circular but safe**: places↔items and lists↔travel circles managed via separate table definitions
4. **Clean root layer**: shared.schema provides column helpers without pgTable exports

### Table Distribution
- Finance (6 tables): heaviest domain
- Calendar, Career, Places, Travel (4 tables each): multi-domain aggregators
- Most domains (16): single table with user FK

### Integration Notes
- No actual circular imports detected (only logical circular relationships)
- Deploy order: shared → roots (activity, company, health) → users → auth → others
- Ready for sharding strategy (users.schema as single chokepoint)
