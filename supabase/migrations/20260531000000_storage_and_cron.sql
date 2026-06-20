-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES 
  ('institution-uploads', 'institution-uploads', false, 5242880), -- 5MB
  ('institution-reports', 'institution-reports', false, null)
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

-- Drop existing policies if any to avoid errors on reruns
DROP POLICY IF EXISTS "Admin can upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin can view" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete" ON storage.objects;
DROP POLICY IF EXISTS "Users can view reports" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload reports" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete reports" ON storage.objects;

-- Policies for institution-uploads
CREATE POLICY "Admin can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'institution-uploads');
CREATE POLICY "Admin can view" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'institution-uploads');
CREATE POLICY "Admin can delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'institution-uploads');

-- Policies for institution-reports
CREATE POLICY "Users can view reports" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'institution-reports');
CREATE POLICY "Admin can upload reports" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'institution-reports');
CREATE POLICY "Admin can delete reports" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'institution-reports');

-- pg_cron setup for daily jobs (2am EAT which is 23:00 UTC)
SELECT cron.schedule('delete-old-jobs', '0 23 * * *', $$
  DELETE FROM "processing_jobs" WHERE status = 'completed' AND "completed_at" < NOW() - INTERVAL '30 days';
$$);

SELECT cron.schedule('delete-old-notifications', '0 23 * * *', $$
  DELETE FROM "scheduled_notifications" WHERE "sent_at" IS NOT NULL AND "sent_at" < NOW() - INTERVAL '7 days';
$$);

SELECT cron.schedule('delete-old-ai-convos', '0 23 * * *', $$
  DELETE FROM "AiConversation" WHERE "createdAt" < NOW() - INTERVAL '90 days' AND "userId" IN (SELECT id FROM "User" WHERE plan = 'free');
$$);

-- pg_cron setup for weekly jobs (Sunday at 3am EAT which is 0:00 UTC Sunday)
SELECT cron.schedule('delete-old-uploads', '0 0 * * 0', $$
  DELETE FROM storage.objects WHERE bucket_id = 'institution-uploads' AND created_at < NOW() - INTERVAL '90 days';
$$);

SELECT cron.schedule('delete-old-reports', '0 0 * * 0', $$
  DELETE FROM storage.objects WHERE bucket_id = 'institution-reports' AND created_at < NOW() - INTERVAL '180 days';
$$);

-- Monthly on the 1st at 4am EAT (1:00 UTC)
SELECT cron.schedule('reset-elite-credits', '0 1 1 * *', $$
  UPDATE "UserCredits" SET balance = 100 WHERE "userId" IN (SELECT id FROM "User" WHERE plan = 'elite');
$$);
