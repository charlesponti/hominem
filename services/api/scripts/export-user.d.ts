/**
 * Exports every row belonging to a user across all `app.*` tables (plus their
 * `user` row) to `.exports/<userId>/<table>.csv`.
 *
 * Usage: pnpm export-user --userId <id> [--env development|production] [--yes]
 *
 * Table discovery is generic - it just looks through information_schema for
 * any `app.*` table with a user/owner column. `user_id`, `userid`,
 * `owner_userid`, `owner_userId`, whatever casing, they all normalize to the
 * same match, so new tables work automatically as long as they follow one of
 * those naming conventions.
 *
 * `--env production` needs PRODUCTION_DATABASE_URL set (never hardcode it)
 * plus `--yes`, since this pulls real user data onto your local disk.
 */
import 'dotenv/config';
