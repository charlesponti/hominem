/**
 * Creates a dev collection invite for a user by email.
 *
 * Usage: pnpm invite-user --email <user email>
 *
 * Set DEV_INVITE_OWNER_EMAIL to pick the collection owner - otherwise it just
 * grabs the first dev collection that has one.
 */
import 'dotenv/config';
import { parseArgs } from 'node:util';

function die(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

function redactDatabaseUrl(value: string): string {
  return value.replace(/:[^:@]*@/, ':***@');
}

function parseEmail(): string {
  const { values } = parseArgs({
    options: { email: { type: 'string' } },
    strict: true,
  });

  const email = values.email?.trim().toLowerCase();
  if (!email) die('--email is required.');
  if (!/^\S+@\S+\.\S+$/.test(email)) die(`Invalid email: ${email}`);
  return email;
}

async function main() {
  if ((process.env.NODE_ENV ?? 'development') === 'production') {
    die('invite-user is development-only.');
  }

  const email = parseEmail();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) die('DATABASE_URL is required.');

  const { db, pool } = await import('@hominem/db');
  const { inviteMember } = await import('../src/application/collections.service');
  const ownerEmail = process.env.DEV_INVITE_OWNER_EMAIL?.trim().toLowerCase();

  const collection = await db
    .selectFrom('app.collections')
    .innerJoin('user', 'user.id', 'app.collections.ownerUserid')
    .select([
      'app.collections.id as collectionId',
      'app.collections.name as collectionName',
      'app.collections.ownerUserid as ownerUserId',
      'user.email as ownerEmail',
    ])
    .$if(Boolean(ownerEmail), (query) => query.where('user.email', '=', ownerEmail!))
    .orderBy('app.collections.createdat', 'asc')
    .executeTakeFirst();

  if (!collection) {
    die(
      ownerEmail
        ? `No collection found for DEV_INVITE_OWNER_EMAIL=${ownerEmail}.`
        : 'No development collection with an owner was found.',
    );
  }

  const result = await inviteMember(collection.ownerUserId, {
    collectionId: collection.collectionId,
    email,
    role: 'viewer',
  });

  const target = result.member.userId ? 'existing account' : 'email-only invite';
  console.log(`\n✓ invited ${email} (${target})`);
  console.log(`  Collection: ${collection.collectionName}`);
  console.log(`  Owner:      ${collection.ownerEmail}`);
  console.log(`  Database:   ${redactDatabaseUrl(databaseUrl)}`);

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
