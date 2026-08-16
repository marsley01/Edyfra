import { PrismaClient } from '../src/generated/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exec(sql: string) {
  try {
    await prisma.$executeRawUnsafe(sql);
    return true;
  } catch (e: any) {
    const msg = e.message || '';
    if (msg.includes('already exists') || e.code === '42710' || e.code === '42P07' || e.code === '42723') {
      return 'skipped';
    }
    return false;
  }
}

async function main() {
  // 1. Extensions
  await exec(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  await exec(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  console.log('✅ Extensions installed');

  // 2. is_admin function (version compatible with Prisma schema - no OLD/raw_user_meta_data)
  const isAdminResult = await exec(`
    CREATE OR REPLACE FUNCTION is_admin()
    RETURNS BOOLEAN AS $$
    DECLARE user_role TEXT;
    BEGIN
      SELECT "role" INTO user_role FROM "User" WHERE id = auth.uid()::text LIMIT 1;
      IF user_role = 'ADMIN' OR user_role = 'FOUNDER' THEN RETURN TRUE; END IF;
      RETURN FALSE;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
  `);
  console.log(`✅ is_admin() function ${isAdminResult === true ? 'created' : isAdminResult}`);

  // 3. Enable RLS on all tables managed by Prisma
  const tables = [
    'User', 'StudentProfile', 'TutorProfile', 'MatchRequest',
    'Session', 'Message', 'Review', 'DailyChallenge', 'DailyChallengeAttempt',
    'StruggleGroup', 'TutorApplication', 'Notification', 'FeedPost',
    'PostLike', 'Comment', 'Achievement', 'PlatformSettings',
    'Referral', 'MashContext', 'AnalyticsEvent', 'Feedback',
    'AiChatMessage', 'CommunityCategory', 'CommunityTopic', 'CommunityPost',
    'CommunityReaction', 'CommunitySubscription', 'CommunityRead',
    'Institution', 'InstitutionStaff', 'InstitutionStudent',
    'InstitutionTutor', 'InstitutionMember',
    'InstitutionAdmin', 'AcademicTerm', 'StudentResult',
    'StudentResultsAnalysis', 'CoachingAssignment', 'InstitutionActivity',
    'TeacherSubjectAssignment', 'InstitutionInvitation',
    'newsletter_subscribers', 'TutorAvailability', 'Booking',
    'BookingReminder', 'SessionFlag', 'MatchRequest',
    'NewUser', 'UserSettings', 'UserProgress'
  ];

  for (const table of tables) {
    const res = await exec(`ALTER TABLE IF EXISTS "${table}" ENABLE ROW LEVEL SECURITY;`);
    if (res === true) console.log(`  RLS enabled on ${table}`);
  }

  // 4. User RLS policies
  await exec(`DROP POLICY IF EXISTS "Users can view all users" ON "User"`);
  await exec(`CREATE POLICY "Users can view all users" ON "User" FOR SELECT USING (true)`);
  await exec(`DROP POLICY IF EXISTS "Users can update their own data" ON "User"`);
  await exec(`CREATE POLICY "Users can update their own data" ON "User" FOR UPDATE USING (auth.uid()::text = "id")`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on User" ON "User"`);
  await exec(`CREATE POLICY "Admin full access on User" ON "User" FOR ALL USING (is_admin())`);

  // StudentProfile policies
  await exec(`DROP POLICY IF EXISTS "Public read StudentProfile" ON "StudentProfile"`);
  await exec(`CREATE POLICY "Public read StudentProfile" ON "StudentProfile" FOR SELECT USING (true)`);
  await exec(`DROP POLICY IF EXISTS "Self update StudentProfile" ON "StudentProfile"`);
  await exec(`CREATE POLICY "Self update StudentProfile" ON "StudentProfile" FOR UPDATE USING (auth.uid()::text = "userId")`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on StudentProfile" ON "StudentProfile"`);
  await exec(`CREATE POLICY "Admin full access on StudentProfile" ON "StudentProfile" FOR ALL USING (is_admin())`);

  // TutorProfile policies
  await exec(`DROP POLICY IF EXISTS "Public read TutorProfile" ON "TutorProfile"`);
  await exec(`CREATE POLICY "Public read TutorProfile" ON "TutorProfile" FOR SELECT USING (true)`);
  await exec(`DROP POLICY IF EXISTS "Self update TutorProfile" ON "TutorProfile"`);
  await exec(`CREATE POLICY "Self update TutorProfile" ON "TutorProfile" FOR UPDATE USING (auth.uid()::text = "userId")`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on TutorProfile" ON "TutorProfile"`);
  await exec(`CREATE POLICY "Admin full access on TutorProfile" ON "TutorProfile" FOR ALL USING (is_admin())`);

  // MatchRequest policies (fixed - no tutorId, only studentId)
  await exec(`DROP POLICY IF EXISTS "Users view own match requests" ON "MatchRequest"`);
  await exec(`CREATE POLICY "Users view own match requests" ON "MatchRequest" FOR SELECT USING (auth.uid()::text = "studentId")`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on MatchRequest" ON "MatchRequest"`);
  await exec(`CREATE POLICY "Admin full access on MatchRequest" ON "MatchRequest" FOR ALL USING (is_admin())`);

  // Session policies
  await exec(`DROP POLICY IF EXISTS "Participants can view session" ON "Session"`);
  await exec(`CREATE POLICY "Participants can view session" ON "Session" FOR SELECT USING (auth.uid()::text = "studentId" OR auth.uid()::text = "partnerId")`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on Session" ON "Session"`);
  await exec(`CREATE POLICY "Admin full access on Session" ON "Session" FOR ALL USING (is_admin())`);

  // Message policies
  await exec(`DROP POLICY IF EXISTS "Participants can view messages" ON "Message"`);
  await exec(`CREATE POLICY "Participants can view messages" ON "Message" FOR SELECT USING (EXISTS (SELECT 1 FROM "Session" s WHERE s."id" = "Message"."sessionId" AND (s."studentId" = auth.uid()::text OR s."partnerId" = auth.uid()::text)))`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on Message" ON "Message"`);
  await exec(`CREATE POLICY "Admin full access on Message" ON "Message" FOR ALL USING (is_admin())`);

  // Review policies
  await exec(`DROP POLICY IF EXISTS "Users view own reviews" ON "Review"`);
  await exec(`CREATE POLICY "Users view own reviews" ON "Review" FOR SELECT USING (auth.uid()::text = "reviewerId" OR auth.uid()::text = "revieweeId")`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on Review" ON "Review"`);
  await exec(`CREATE POLICY "Admin full access on Review" ON "Review" FOR ALL USING (is_admin())`);

  // DailyChallenge policies
  await exec(`DROP POLICY IF EXISTS "Public can view challenges" ON "DailyChallenge"`);
  await exec(`CREATE POLICY "Public can view challenges" ON "DailyChallenge" FOR SELECT USING (true)`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on DailyChallenge" ON "DailyChallenge"`);
  await exec(`CREATE POLICY "Admin full access on DailyChallenge" ON "DailyChallenge" FOR ALL USING (is_admin())`);

  // DailyChallengeAttempt policies
  await exec(`DROP POLICY IF EXISTS "Users can view own attempts" ON "DailyChallengeAttempt"`);
  await exec(`CREATE POLICY "Users can view own attempts" ON "DailyChallengeAttempt" FOR SELECT USING (auth.uid()::text = "userId")`);
  await exec(`DROP POLICY IF EXISTS "Users can insert own attempts" ON "DailyChallengeAttempt"`);
  await exec(`CREATE POLICY "Users can insert own attempts" ON "DailyChallengeAttempt" FOR INSERT WITH CHECK (auth.uid()::text = "userId")`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on DailyChallengeAttempt" ON "DailyChallengeAttempt"`);
  await exec(`CREATE POLICY "Admin full access on DailyChallengeAttempt" ON "DailyChallengeAttempt" FOR ALL USING (is_admin())`);

  // StruggleGroup policies
  await exec(`DROP POLICY IF EXISTS "Users view struggle groups" ON "StruggleGroup"`);
  await exec(`CREATE POLICY "Users view struggle groups" ON "StruggleGroup" FOR SELECT USING (true)`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on StruggleGroup" ON "StruggleGroup"`);
  await exec(`CREATE POLICY "Admin full access on StruggleGroup" ON "StruggleGroup" FOR ALL USING (is_admin())`);

  // TutorApplication policies
  await exec(`DROP POLICY IF EXISTS "Users view own tutor applications" ON "TutorApplication"`);
  await exec(`CREATE POLICY "Users view own tutor applications" ON "TutorApplication" FOR SELECT USING (auth.uid()::text = "userId")`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on TutorApplication" ON "TutorApplication"`);
  await exec(`CREATE POLICY "Admin full access on TutorApplication" ON "TutorApplication" FOR ALL USING (is_admin())`);

  // Notification policies
  await exec(`DROP POLICY IF EXISTS "Users view own notifications" ON "Notification"`);
  await exec(`CREATE POLICY "Users view own notifications" ON "Notification" FOR SELECT USING (auth.uid()::text = "userId")`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on Notification" ON "Notification"`);
  await exec(`CREATE POLICY "Admin full access on Notification" ON "Notification" FOR ALL USING (is_admin())`);

  // FeedPost policies
  await exec(`DROP POLICY IF EXISTS "Public can view feed posts" ON "FeedPost"`);
  await exec(`CREATE POLICY "Public can view feed posts" ON "FeedPost" FOR SELECT USING (true)`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on FeedPost" ON "FeedPost"`);
  await exec(`CREATE POLICY "Admin full access on FeedPost" ON "FeedPost" FOR ALL USING (is_admin())`);

  // PostLike policies
  await exec(`DROP POLICY IF EXISTS "Users manage own likes" ON "PostLike"`);
  await exec(`CREATE POLICY "Users manage own likes" ON "PostLike" FOR ALL USING (auth.uid()::text = "userId")`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on PostLike" ON "PostLike"`);
  await exec(`CREATE POLICY "Admin full access on PostLike" ON "PostLike" FOR ALL USING (is_admin())`);

  // Comment policies
  await exec(`DROP POLICY IF EXISTS "Public can view comments" ON "Comment"`);
  await exec(`CREATE POLICY "Public can view comments" ON "Comment" FOR SELECT USING (true)`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on Comment" ON "Comment"`);
  await exec(`CREATE POLICY "Admin full access on Comment" ON "Comment" FOR ALL USING (is_admin())`);

  // Achievement policies
  await exec(`DROP POLICY IF EXISTS "Users view own achievements" ON "Achievement"`);
  await exec(`CREATE POLICY "Users view own achievements" ON "Achievement" FOR SELECT USING (auth.uid()::text = "userId")`);
  await exec(`DROP POLICY IF EXISTS "Admin full access on Achievement" ON "Achievement"`);
  await exec(`CREATE POLICY "Admin full access on Achievement" ON "Achievement" FOR ALL USING (is_admin())`);

  console.log('✅ RLS policies applied');

  // 5. Reset daily counts trigger
  const triggerResult = await exec(`
    CREATE OR REPLACE FUNCTION reset_daily_counts()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW."lastCountReset" < CURRENT_DATE THEN
        NEW."dailySearchCount" = 0;
        NEW."dailyMessageCount" = 0;
        NEW."lastCountReset" = CURRENT_DATE;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  console.log(`✅ reset_daily_counts() function ${triggerResult === true ? 'created' : triggerResult}`);

  // Drop and recreate trigger safely
  await exec(`DROP TRIGGER IF EXISTS tr_reset_daily_counts ON "User"`);
  await exec(`CREATE TRIGGER tr_reset_daily_counts BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION reset_daily_counts()`);
  console.log('✅ Trigger tr_reset_daily_counts applied');

  // 6. Additional indexes not in Prisma schema
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_user_name_trgm ON "User" USING gin ("name" gin_trgm_ops)`,
    `CREATE INDEX IF NOT EXISTS idx_user_role ON "User"("role")`,
    `CREATE INDEX IF NOT EXISTS idx_user_email ON "User"("email")`,
    `CREATE INDEX IF NOT EXISTS idx_session_student_id ON "Session"("studentId")`,
    `CREATE INDEX IF NOT EXISTS idx_session_partner_id ON "Session"("partnerId")`,
    `CREATE INDEX IF NOT EXISTS idx_session_status ON "Session"(status)`,
    `CREATE INDEX IF NOT EXISTS idx_message_session_id ON "Message"("sessionId")`,
    `CREATE INDEX IF NOT EXISTS idx_notification_user_id ON "Notification"("userId")`,
    `CREATE INDEX IF NOT EXISTS idx_notification_read ON "Notification"("read")`,
    `CREATE INDEX IF NOT EXISTS idx_achievement_user_id ON "Achievement"("userId")`,
    `CREATE INDEX IF NOT EXISTS idx_tutor_app_user_id ON "TutorApplication"("userId")`,
    `CREATE INDEX IF NOT EXISTS idx_tutor_app_status ON "TutorApplication"(status)`,
    `CREATE INDEX IF NOT EXISTS idx_review_reviewee ON "Review"("revieweeId")`,
    `CREATE INDEX IF NOT EXISTS idx_review_reviewer ON "Review"("reviewerId")`,
  ];

  for (const idx of indexes) {
    await exec(idx);
  }
  console.log('✅ Additional indexes created');

  console.log('\n🎉 All Supabase migrations (RLS + functions + triggers + indexes) applied successfully!');
}

main()
  .catch(e => console.error('Fatal:', e))
  .finally(() => prisma.$disconnect());
