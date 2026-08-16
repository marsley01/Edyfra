import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function check(sql: string, label: string) {
  try {
    const r = await prisma.$queryRawUnsafe(sql);
    console.log(`  ✅ ${label}`);
    return r;
  } catch (e: any) {
    console.log(`  ❌ ${label}: ${e.message.substring(0, 120)}`);
    return null;
  }
}

async function main() {
  console.log('🔍 DATABASE HEALTH CHECK\n');

  // 1. Extensions
  console.log('--- Extensions ---');
  await check(`SELECT * FROM pg_extension WHERE extname = 'pg_trgm'`, 'pg_trgm extension');
  await check(`SELECT * FROM pg_extension WHERE extname = 'unaccent'`, 'unaccent extension');

  // 2. Functions
  console.log('\n--- Functions ---');
  await check(`SELECT proname FROM pg_proc WHERE proname = 'is_admin'`, 'is_admin() function');
  await check(`SELECT proname FROM pg_proc WHERE proname = 'reset_daily_counts'`, 'reset_daily_counts() function');

  // 3. Triggers
  console.log('\n--- Triggers ---');
  await check(`SELECT tgname FROM pg_trigger WHERE tgname = 'tr_reset_daily_counts' AND tgname !~ '^pg_'`, 'tr_reset_daily_counts trigger');

  // 4. RLS enabled on key tables
  console.log('\n--- RLS Status (key tables) ---');
  const keyTables = ['User', 'StudentProfile', 'TutorProfile', 'Session', 'Message', 'Review', 'DailyChallenge', 'Notification', 'FeedPost', 'Institution', 'Booking', 'TutorAvailability'];
  for (const t of keyTables) {
    await check(`SELECT relname, relrowsecurity FROM pg_class WHERE relname = '${t}' AND relrowsecurity = true`, `RLS on ${t}`);
  }

  // 5. RLS Policy count
  console.log('\n--- RLS Policies ---');
  const policyCount = await prisma.$queryRawUnsafe<{count: bigint}[]>(`SELECT count(*) as count FROM pg_policies WHERE schemaname = 'public'`);
  console.log(`  📊 ${policyCount[0].count} total RLS policies on public schema`);

  // 6. Table count
  console.log('\n--- Tables ---');
  const tables = await prisma.$queryRawUnsafe<{tablename: string}[]>(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_supabase_migrations') ORDER BY tablename`);
  console.log(`  📊 ${tables.length} user tables:`);
  tables.forEach((t: any) => console.log(`     - ${t.tablename}`));

  // 7. Seed data
  console.log('\n--- Seed Data ---');
  const challenges = await prisma.dailyChallenge.count();
  console.log(`  📊 ${challenges} Daily Challenges`);

  // 8. Prisma schema check
  console.log('\n--- Prisma Schema Sync ---');
  try {
    await prisma.$queryRawUnsafe(`SELECT * FROM "User" LIMIT 0`);
    console.log('  ✅ User table accessible');
    await prisma.$queryRawUnsafe(`SELECT * FROM "Session" LIMIT 0`);
    console.log('  ✅ Session table accessible');
    await prisma.$queryRawUnsafe(`SELECT * FROM "Institution" LIMIT 0`);
    console.log('  ✅ Institution table accessible');
  } catch (e: any) {
    console.log(`  ❌ ${e.message.substring(0, 120)}`);
  }

  // 9. Check for missing migration artifacts
  console.log('\n--- Migration Artifacts ---');
  await check(`SELECT COUNT(*) as c FROM "_prisma_migrations"`, 'Prisma migrations table');
  await check(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'supabase_migrations')`, 'Supabase migration tracking');

  console.log('\n✅ HEALTH CHECK COMPLETE');
}

main()
  .catch(e => console.error('Fatal:', e))
  .finally(() => prisma.$disconnect());