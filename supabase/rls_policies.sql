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

-- Users: Read all, update self
CREATE POLICY "Users can view all users" ON "User" FOR SELECT USING (true);
CREATE POLICY "Users can update their own data" ON "User" FOR UPDATE USING (auth.uid()::text = id);

-- Profiles: Read all, update self
CREATE POLICY "Public read StudentProfile" ON "StudentProfile" FOR SELECT USING (true);
CREATE POLICY "Self update StudentProfile" ON "StudentProfile" FOR UPDATE USING (auth.uid()::text = "userId");
CREATE POLICY "Public read TutorProfile" ON "TutorProfile" FOR SELECT USING (true);
CREATE POLICY "Self update TutorProfile" ON "TutorProfile" FOR UPDATE USING (auth.uid()::text = "userId");

-- MatchRequests: Users can view their own
CREATE POLICY "Users view own match requests" ON "MatchRequest" FOR SELECT USING (auth.uid()::text = "studentId");

-- Sessions: Only participants can view
CREATE POLICY "Participants can view session" ON "Session" FOR SELECT USING (auth.uid()::text = "studentId" OR auth.uid()::text = "partnerId");

-- Messages: Only participants can view
CREATE POLICY "Participants can view messages" ON "Message" FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "Session" s 
        WHERE s.id = "Message"."sessionId" 
        AND (s."studentId" = auth.uid()::text OR s."partnerId" = auth.uid()::text)
    )
);

-- Daily Challenges: Public read
CREATE POLICY "Public can view challenges" ON "DailyChallenge" FOR SELECT USING (true);

-- Daily Challenge Attempts: Users can view their own
CREATE POLICY "Users can view own attempts" ON "DailyChallengeAttempt" FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "Users can insert own attempts" ON "DailyChallengeAttempt" FOR INSERT WITH CHECK (auth.uid()::text = "userId");
