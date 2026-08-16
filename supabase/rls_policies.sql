-- Enable Row Level Security on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TutorProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MatchRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyChallenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyChallengeAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StruggleGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TutorApplication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeedPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PostLike" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Achievement" ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin (Prisma User.role is the source of truth)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM "User" WHERE id = auth.uid()::text LIMIT 1;
  IF user_role = 'ADMIN' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Users: Read all, update self; Admin can do anything
CREATE POLICY "Users can view all users" ON "User" FOR SELECT USING (true);
CREATE POLICY "Users can update their own data" ON "User" FOR UPDATE USING (auth.uid()::text = id);
CREATE POLICY "Admin full access on User" ON "User" FOR ALL USING (is_admin());

-- Profiles: Read all, update self; Admin can do anything
CREATE POLICY "Public read StudentProfile" ON "StudentProfile" FOR SELECT USING (true);
CREATE POLICY "Self update StudentProfile" ON "StudentProfile" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Admin full access on StudentProfile" ON "StudentProfile" FOR ALL USING (is_admin());

CREATE POLICY "Public read TutorProfile" ON "TutorProfile" FOR SELECT USING (true);
CREATE POLICY "Self update TutorProfile" ON "TutorProfile" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Admin full access on TutorProfile" ON "TutorProfile" FOR ALL USING (is_admin());

-- MatchRequests: Users can view their own; Admin can view all
CREATE POLICY "Users view own match requests" ON "MatchRequest" FOR SELECT USING (auth.uid()::text = "studentId");
CREATE POLICY "Admin full access on MatchRequest" ON "MatchRequest" FOR ALL USING (is_admin());

-- Sessions: Only participants can view; Admin can view all
CREATE POLICY "Participants can view session" ON "Session" FOR SELECT USING (auth.uid()::text = "studentId" OR auth.uid()::text = "partnerId");
CREATE POLICY "Admin full access on Session" ON "Session" FOR ALL USING (is_admin());

-- Messages: Only participants can view; Admin can view all
CREATE POLICY "Participants can view messages" ON "Message" FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "Session" s 
        WHERE s.id = "Message"."sessionId" 
        AND (s."studentId" = auth.uid()::text OR s."partnerId" = auth.uid()::text)
    )
);
CREATE POLICY "Admin full access on Message" ON "Message" FOR ALL USING (is_admin());

-- Reviews: Users can view their own; Admin can view all
CREATE POLICY "Users view own reviews" ON "Review" FOR SELECT USING (auth.uid()::text = "reviewerId" OR auth.uid()::text = "revieweeId");
CREATE POLICY "Admin full access on Review" ON "Review" FOR ALL USING (is_admin());

-- Daily Challenges: Public read
CREATE POLICY "Public can view challenges" ON "DailyChallenge" FOR SELECT USING (true);
CREATE POLICY "Admin full access on DailyChallenge" ON "DailyChallenge" FOR ALL USING (is_admin());

-- Daily Challenge Attempts: Users can view their own; Admin can view all
CREATE POLICY "Users can view own attempts" ON "DailyChallengeAttempt" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own attempts" ON "DailyChallengeAttempt" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
CREATE POLICY "Admin full access on DailyChallengeAttempt" ON "DailyChallengeAttempt" FOR ALL USING (is_admin());

-- Struggle Groups: Admin can view all
CREATE POLICY "Users view struggle groups" ON "StruggleGroup" FOR SELECT USING (true);
CREATE POLICY "Admin full access on StruggleGroup" ON "StruggleGroup" FOR ALL USING (is_admin());

-- Tutor Applications: Users can view their own; Admin can view all
CREATE POLICY "Users view own tutor applications" ON "TutorApplication" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Admin full access on TutorApplication" ON "TutorApplication" FOR ALL USING (is_admin());

-- Notifications: Users can view their own; Admin can view all
CREATE POLICY "Users view own notifications" ON "Notification" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Admin full access on Notification" ON "Notification" FOR ALL USING (is_admin());

-- Feed Posts: Public read
CREATE POLICY "Public can view feed posts" ON "FeedPost" FOR SELECT USING (true);
CREATE POLICY "Admin full access on FeedPost" ON "FeedPost" FOR ALL USING (is_admin());

-- Post Likes: Users can manage their own
CREATE POLICY "Users manage own likes" ON "PostLike" FOR ALL USING (auth.uid()::text = "userId");
CREATE POLICY "Admin full access on PostLike" ON "PostLike" FOR ALL USING (is_admin());

-- Comments: Public read
CREATE POLICY "Public can view comments" ON "Comment" FOR SELECT USING (true);
CREATE POLICY "Admin full access on Comment" ON "Comment" FOR ALL USING (is_admin());

-- Achievements: Users can view their own; Admin can view all
CREATE POLICY "Users view own achievements" ON "Achievement" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Admin full access on Achievement" ON "Achievement" FOR ALL USING (is_admin());
