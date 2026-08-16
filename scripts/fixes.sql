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

DROP TRIGGER IF EXISTS tr_reset_daily_counts ON "User";
CREATE TRIGGER tr_reset_daily_counts
  BEFORE UPDATE ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION reset_daily_counts();

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_user_name_trgm ON "User" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_user_created_at ON "User"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_notification_read ON "Notification"("read");
CREATE INDEX IF NOT EXISTS idx_tutor_app_status ON "TutorApplication"(status);
CREATE INDEX IF NOT EXISTS idx_message_created_at ON "Message"("createdAt" DESC);
