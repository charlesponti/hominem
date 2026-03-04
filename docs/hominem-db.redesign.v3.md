## `hominem-db` Redesign

### 1. **Multiple "People" Tables** 🚩 CRITICAL
You have overlapping tables that serve the same purpose:
- **`users`** - User accounts with auth info (email, name, image, etc.)
- **`contacts`** - Contact records (first_name, last_name, email, phone, etc.)
- **`people`** - Simple people records (first_name, last_name, middle_name, notes)

**Issue:** These three tables represent essentially the same entity (people) with different structures. This creates data duplication and inconsistency.

### 2. **Identity & Authentication Fragmentation** 🚩 
The `users` table has conflicting identity fields:
- `supabase_id`
- `primary_auth_subject_id`
- `better_auth_user_id`

**Issue:** Multiple auth provider IDs suggest migrations or transitions that haven't been cleaned up, creating confusion about the true source of truth.

### 3. **Contact Information Scattered** 🚩
Contact details are split across tables:
- `users` has: email, image, photo_url
- `contacts` has: email, phone, linkedin_url, title
- `people` has: notes
- `entities` has: domain, metadata

**Issue:** No single place to find all contact information for a person.

### 4. **Naming Inconsistencies** 
Timestamp column names vary:
- `users`: `createdAt`, `updatedAt` (camelCase)
- `contacts`: `created_at`, `updated_at` (snake_case)
- `entities`: `created_at`, `updated_at` (snake_case)

**Issue:** Inconsistent naming conventions make querying harder.

### 5. **Legacy Data Indicators** 🚩
The `contacts` table has suspicious fields:
- `sqlite_id`, `source_db`, `source_file`, `extra` (JSONB)

**Issue:** Indicates a migration from SQLite that wasn't fully normalized.

## **Recommendations:**

1. **Consolidate people tables** - Merge `people`, `contacts`, and user profile data into a unified schema
2. **Clean up auth** - Choose ONE auth system and remove obsolete ID columns
3. **Normalize contacts** - Create a separate `contact_information` table with relationships
4. **Standardize timestamps** - Use consistent snake_case or camelCase across all tables
5. **Remove migration debris** - Clean up `sqlite_id`, `source_db`, `source_file`
6. **Document social_media relationship** - Link `social_media` to the appropriate person/user table

### **6. Merge `activity_log` + `audit_log` into single `logs` table** 🚩
**Current State:**
- `activity_log` (entity_id, action, domain, description, metadata)
- `audit_log` (table_name, record_id, action, old_data, new_data, changed_by)

**Issue:** Two separate logging tables for essentially the same purpose. Different schema designs make querying difficult.

**Recommendation:**
```sql
CREATE TABLE logs (
    id UUID PRIMARY KEY,
    log_type TEXT NOT NULL, -- 'activity' or 'audit'
    user_id UUID,
    entity_id TEXT,
    entity_type TEXT, -- 'contact', 'transaction', etc.
    action TEXT NOT NULL,
    domain TEXT,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT now()
);
```

---

### **7. Fix Data Type Inconsistencies** 🚩
**Current Issues:**
- `entities.created_at` is TEXT (not TIMESTAMP)
- `activity_log.created_at` is TEXT (not TIMESTAMP)
- `audit_log.timestamp` is TIMESTAMP
- Mixed use of `id` types: UUID vs INT4 vs TEXT across tables

**Recommendation:** Standardize all timestamps to TIMESTAMP and all IDs to UUID where possible.

---

### **8. Merge Health Tables: `health` + `health_log`** 🚩
**Current State:**
- `health` (user_id, date, activity_type, duration, calories_burned, notes)
- `health_log` (timestamp, platform, metric_type, value, unit, source_file)

**Issue:** Overlapping health tracking. One tracks activities, other tracks metrics. Should be unified.

**Recommendation:**
```sql
CREATE TABLE health_records (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    record_type TEXT NOT NULL, -- 'activity' or 'metric'
    metric_type TEXT, -- 'steps', 'heart_rate', 'calories', etc.
    value DECIMAL,
    unit TEXT,
    duration_minutes INT,
    activity_type TEXT,
    platform TEXT,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    source TEXT DEFAULT 'manual'
);
```

---

### **9. Separate Finance into Core Tables** 🚩
**Current Issues:**
- `transactions` table is bloated (41 columns!) with multiple concerns mixed together
- `finance_expenses` is a separate static expenses table
- Redundant categories and timestamps

**Recommendation:** Split into:
- `transactions` (core transaction data)
- `transaction_categories` (normalized reference table)
- `recurring_transactions` (separate from one-off)
- `expenses` (for planned/budgeted expenses like `finance_expenses`)

---

### **10. Standardize Timestamp Column Names** ⚠️
**Current Inconsistencies:**
- `users`: `createdAt`, `updatedAt` (camelCase)
- `contacts`: `created_at`, `updated_at` (snake_case)
- `entities`: `created_at`, `updated_at` (snake_case, as TEXT)
- `audit_log`: `timestamp` (singular)
- `health`: `created_at`, `updated_at` (snake_case)
- `movie`: `createdAt`, `updatedAt` (camelCase)
- `item`, `list`, `chat_message`: `createdAt`, `updatedAt` (camelCase)

**Recommendation:** Enforce **one convention database-wide**. Snake_case is more SQL-idiomatic:
```sql
ALTER TABLE users RENAME createdAt TO created_at;
ALTER TABLE users RENAME updatedAt TO updated_at;
```

---

### **11. Remove Migration Debris Columns** 🚩
**Current Issues:**
- `contacts.sqlite_id` - indicates SQLite migration
- `contacts.source_db` - always equals 'postgres'
- `contacts.source_file` - migration artifact
- `transactions.sqlite_id` - same issue
- `health_log.source_file` - migration artifact

**Recommendation:** Archive these columns to a migration table or delete if no longer needed. They clutter the schema.

---

### **12. Create Proper `social_media_profiles` Table with FKs** 🚩
**Current Issue:**
- `social_media` table has NO FOREIGN KEY linking to users/contacts/people
- Only has `handle` and `platform` - no relationship defined
- Unclear which person owns which social media account

**Recommendation:**
```sql
CREATE TABLE social_media_profiles (
    id UUID PRIMARY KEY,
    contact_id UUID NOT NULL REFERENCES contacts(id),
    platform TEXT NOT NULL, -- 'linkedin', 'twitter', 'github', etc.
    handle TEXT NOT NULL,
    profile_url TEXT,
    bio TEXT,
    followers_count INT,
    verified BOOLEAN DEFAULT false,
    last_scraped_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(contact_id, platform)
);
```

---

### **13. Consolidate Movie Tables with Proper Relationships** ⚠️
**Current Issues:**
- `movie` and `movie_viewings` exist but lack proper foreign key constraints
- No user profile information (should link to `users`)
- `movieId` uses camelCase while UUID columns elsewhere use snake_case

**Recommendation:** Enforce FKs and standardize naming:
```sql
ALTER TABLE movie_viewings ADD CONSTRAINT fk_movie 
  FOREIGN KEY (movieId) REFERENCES movie(id);
ALTER TABLE movie_viewings ADD CONSTRAINT fk_user 
  FOREIGN KEY (userId) REFERENCES users(id);
-- Rename to snake_case
ALTER TABLE movie_viewings RENAME movieId TO movie_id;
ALTER TABLE movie_viewings RENAME userId TO user_id;
```

---

### **14. Fix `item` and `list` Table Design** 🚩
**Current Issues:**
- `item.itemId` is redundant/unclear - what is this pointing to?
- `itemType` enum has FLIGHT and PLACE but no actual flight/place data structure
- `item.type` and `item.itemType` are TWO separate fields with unclear difference
- Foreign key to actual flights/places is missing

**Recommendation:**
```sql
-- Remove the ambiguous generic design
-- Instead, create actual tables:
CREATE TABLE list_items (
    id UUID PRIMARY KEY,
    list_id UUID NOT NULL REFERENCES list(id),
    item_type TEXT NOT NULL, -- 'place', 'flight', 'task'
    place_id UUID REFERENCES places(id),
    flight_id UUID REFERENCES flights(id),
    custom_title TEXT,
    order_position INT,
    created_at TIMESTAMP DEFAULT now()
);
```

---

### **15. Implement Missing Foreign Keys for Data Integrity** 🚩
**Critical Missing Relationships:**
- `contacts.user_id` → `users(id)` (no FK constraint)
- `transactions.user_id` → `users(id)` (no FK constraint)
- `health.user_id` → `users(id)` (no FK constraint)
- `movie_viewings.userId` → `users(id)` (no FK constraint)
- `chat.userId` → `users(id)` (no FK constraint)
- `chat_message.userId` → `users(id)` (no FK constraint)
- `social_media` → nothing (orphaned table!)

**Recommendation:** Add proper constraints:
```sql
ALTER TABLE contacts ADD CONSTRAINT fk_contacts_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE social_media ADD CONSTRAINT fk_social_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
-- etc.
```

---

## **Summary Table:**

| # | Issue | Type | Severity | Tables Affected |
|---|-------|------|----------|-----------------|
| 6 | Duplicate logging tables | Merge | HIGH | activity_log, audit_log |
| 7 | Inconsistent data types | Standardize | MEDIUM | entities, activity_log, all tables |
| 8 | Duplicate health tracking | Merge | HIGH | health, health_log |
| 9 | Bloated transactions table | Split | HIGH | transactions, finance_expenses |
| 10 | Inconsistent timestamp naming | Rename | MEDIUM | All tables |
| 11 | Migration debris columns | Remove | MEDIUM | contacts, transactions, health_log |
| 12 | Orphaned social_media table | Fix | HIGH | social_media |
| 13 | Missing FK constraints | Add | CRITICAL | movie_viewings, chat, health |
| 14 | Unclear item design | Redesign | HIGH | item, list |
| 15 | No referential integrity | Add FKs | CRITICAL | 8+ tables |
