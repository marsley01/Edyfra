import { PrismaClient } from '../src/generated/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function runStatements(sql: string, label: string) {
  // Split SQL by semicolons, filter empty statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt + ';');
      success++;
    } catch (e: any) {
      const msg = e.message || '';
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate') ||
        msg.includes('does not exist, skipping') ||
        msg.includes('already a member') ||
        e.code === '42710' ||
        e.code === '42P07' ||
        e.code === '42P16' ||
        e.code === '42723'
      ) {
        skipped++;
      } else {
        console.error(`  ✗ [${label}] ${msg.substring(0, 200)}`);
        failed++;
      }
    }
  }

  console.log(`  ${label}: ${success} OK, ${skipped} skipped, ${failed} failed`);
  return failed;
}

async function main() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

  // First: extensions (safe)
  console.log('\n📦 Installing extensions...');
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS unaccent;`);
  console.log('  Extensions OK');

  // RLS migrations
  const files = [
    'rls_policies.sql',
    'feature_flags.sql',
    '06_missing_profile_columns.sql',
    '07_fix_role_authorization.sql',
    '08_fix_reviews_rls.sql',
    '09_newsletter_subscribers.sql',
    '10_monetization_system.sql',
    '11_create_missing_tables.sql',
    '12_fix_resources_rls.sql',
    '13_booking_system.sql',
    '14_comprehensive_update.sql',
    '15_institution_v2_system.sql',
  ];

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    if (!fs.existsSync(fullPath)) continue;

    const sql = fs.readFileSync(fullPath, 'utf8');
    console.log(`\n📄 ${file}...`);
    await runStatements(sql, file);
  }

  console.log('\n✅ Migration run complete');
}

main()
  .catch(e => console.error('Fatal:', e))
  .finally(() => prisma.$disconnect());