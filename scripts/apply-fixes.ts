import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('1. Creating reset_daily_counts function...');
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION reset_daily_counts()
    RETURNS TRIGGER AS $func$
    BEGIN
      IF NEW."lastCountReset" < CURRENT_DATE THEN
        NEW."dailySearchCount" = 0;
        NEW."dailyMessageCount" = 0;
        NEW."lastCountReset" = CURRENT_DATE;
      END IF;
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  `);
  console.log('   ✅ Function created');

  console.log('2. Creating trigger...');
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS tr_reset_daily_counts ON "User"`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER tr_reset_daily_counts
      BEFORE UPDATE ON "User"
      FOR EACH ROW
      EXECUTE FUNCTION reset_daily_counts();
  `);
  console.log('   ✅ Trigger created');

  console.log('3. Creating additional indexes...');
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_user_name_trgm ON "User" USING gin ("name" gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_user_created_at ON "User"("createdAt" DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_notification_read ON "Notification"("read")`,
    `CREATE INDEX IF NOT EXISTS idx_tutor_app_status ON "TutorApplication"(status)`,
    `CREATE INDEX IF NOT EXISTS idx_message_created_at ON "Message"("createdAt" DESC)`,
  ];
  for (const idx of indexes) {
    await prisma.$executeRawUnsafe(idx);
    console.log(`   ✅ Index: ${idx.substring(0, 60)}...`);
  }

  console.log('\n✅ All missing items applied successfully!');
}

main()
  .catch(e => console.error('Fatal:', e))
  .finally(() => prisma.$disconnect());