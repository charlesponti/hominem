import { sql } from 'drizzle-orm';
import { db } from '../src';

async function main() {
  console.log('🔍 Checking for orphaned records in the database...\n');

  const checks = [
    {
      name: 'Job Applications -> Companies',
      table: 'job_applications',
      column: 'company_id',
      parentTable: 'companies',
      query: sql`
        SELECT count(*) as count 
        FROM job_applications ja
        LEFT JOIN companies c ON ja.company_id = c.id
        WHERE c.id IS NULL AND ja.company_id IS NOT NULL
      `
    },
    {
      name: 'Job Applications -> Users',
      table: 'job_applications',
      column: 'user_id',
      parentTable: 'users',
      query: sql`
        SELECT count(*) as count 
        FROM job_applications ja
        LEFT JOIN users u ON ja.user_id = u.id
        WHERE u.id IS NULL AND ja.user_id IS NOT NULL
      `
    },
    {
      name: 'Work Experiences -> Users',
      table: 'work_experiences',
      column: 'user_id',
      parentTable: 'users',
      query: sql`
        SELECT count(*) as count 
        FROM work_experiences we
        LEFT JOIN users u ON we.user_id = u.id
        WHERE u.id IS NULL AND we.user_id IS NOT NULL
      `
    },
    {
      name: 'Events -> Users',
      table: 'events',
      column: 'user_id',
      parentTable: 'users',
      query: sql`
        SELECT count(*) as count 
        FROM events e
        LEFT JOIN users u ON e.user_id = u.id
        WHERE u.id IS NULL AND e.user_id IS NOT NULL
      `
    },
    {
      name: 'Categories -> Users',
      table: 'categories',
      column: 'user_id',
      parentTable: 'users',
      query: sql`
        SELECT count(*) as count 
        FROM categories c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE u.id IS NULL AND c.user_id IS NOT NULL
      `
    }
  ];

  let totalOrphans = 0;

  for (const check of checks) {
    try {
      const result = await db.execute(check.query);
      const count = Number(result[0].count);
      
      if (count > 0) {
        console.log(`❌ ${check.name}: ${count} orphans found`);
        console.log(`   Query to check: SELECT * FROM ${check.table} WHERE ${check.column} NOT IN (SELECT id FROM ${check.parentTable});`);
        totalOrphans += count;
      } else {
        console.log(`✅ ${check.name}: 0 orphans`);
      }
    } catch (e) {
      console.error(`⚠️ Error checking ${check.name}:`, e);
    }
  }

  console.log('\n-------------------');
  if (totalOrphans > 0) {
    console.log(`⚠️ Found ${totalOrphans} total orphaned records.`);
    console.log('Run cleanup migration before adding foreign key constraints.');
    process.exit(1);
  } else {
    console.log('✨ No orphaned records found. Safe to add constraints.');
    process.exit(0);
  }
}

main();
