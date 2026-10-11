-- Snapshot of every public-schema RLS policy before 20261011120000_lock_down_rls.sql.
-- Running this restores the previous policies exactly.
BEGIN;
DO $$ DECLARE r record; BEGIN FOR r IN SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename); END LOOP; END $$;
CREATE POLICY "authenticated_all" ON public."AcademicTerm" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."Achievement" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."AiConversation" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."Announcement" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."Challenge" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."ChallengeCompletion" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."CoachingAssignment" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."Comment" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."CommunityCategory" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."CommunityPost" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."CommunityReaction" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."CommunityRead" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."CommunitySubscription" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."CommunityTopic" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."CreditTransaction" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."CurriculumTopic" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on DailyChallenge" ON public."DailyChallenge" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Public can view challenges" ON public."DailyChallenge" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "authenticated_all" ON public."DailyChallenge" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on DailyChallengeAttempt" ON public."DailyChallengeAttempt" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Users can insert own attempts" ON public."DailyChallengeAttempt" AS PERMISSIVE FOR INSERT TO public WITH CHECK (((auth.uid())::text = "userId"));
CREATE POLICY "Users can view own attempts" ON public."DailyChallengeAttempt" AS PERMISSIVE FOR SELECT TO public USING (((auth.uid())::text = "userId"));
CREATE POLICY "authenticated_all" ON public."DailyChallengeAttempt" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."FavoriteUser" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on FeedPost" ON public."FeedPost" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Public can view feed posts" ON public."FeedPost" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "authenticated_all" ON public."FeedPost" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."GroupMessage" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage institution" ON public."Institution" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Institution admins can update institution" ON public."Institution" AS PERMISSIVE FOR UPDATE TO public USING ((is_admin() OR (EXISTS ( SELECT 1
   FROM "InstitutionMember" im
  WHERE ((im."institutionId" = "Institution".id) AND (im."userId" = (auth.uid())::text) AND (im.role = ANY (ARRAY['INSTITUTION_ADMIN'::text, 'ADMIN'::text, 'OWNER'::text])) AND (im.status = 'ACTIVE'::text))))));
CREATE POLICY "Members and admins can view institution" ON public."Institution" AS PERMISSIVE FOR SELECT TO public USING ((is_admin() OR (EXISTS ( SELECT 1
   FROM "InstitutionMember" im
  WHERE ((im."institutionId" = "Institution".id) AND (im."userId" = (auth.uid())::text) AND (im.status = 'ACTIVE'::text))))));
CREATE POLICY "authenticated_all" ON public."InstitutionActivity" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."InstitutionAdmin" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."InstitutionInvitation" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Institution admins manage members" ON public."InstitutionMember" AS PERMISSIVE FOR ALL TO public USING ((is_admin() OR (EXISTS ( SELECT 1
   FROM "InstitutionMember" self
  WHERE ((self."institutionId" = "InstitutionMember"."institutionId") AND (self."userId" = (auth.uid())::text) AND (self.role = ANY (ARRAY['INSTITUTION_ADMIN'::text, 'ADMIN'::text, 'OWNER'::text])) AND (self.status = 'ACTIVE'::text))))));
CREATE POLICY "Members view co-members and self view own membership" ON public."InstitutionMember" AS PERMISSIVE FOR SELECT TO public USING ((is_admin() OR ("userId" = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM "InstitutionMember" self
  WHERE ((self."institutionId" = "InstitutionMember"."institutionId") AND (self."userId" = (auth.uid())::text) AND (self.status = 'ACTIVE'::text))))));
CREATE POLICY "authenticated_all" ON public."InstitutionStaff" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Institution staff manage institution students" ON public."InstitutionStudent" AS PERMISSIVE FOR ALL TO public USING ((is_admin() OR (EXISTS ( SELECT 1
   FROM "InstitutionMember" im
  WHERE ((im."institutionId" = "InstitutionStudent"."institutionId") AND (im."userId" = (auth.uid())::text) AND (im.role = ANY (ARRAY['INSTITUTION_ADMIN'::text, 'ADMIN'::text, 'STAFF'::text, 'OWNER'::text])) AND (im.status = 'ACTIVE'::text))))));
CREATE POLICY "Students and staff view institution students" ON public."InstitutionStudent" AS PERMISSIVE FOR SELECT TO public USING ((is_admin() OR ("userId" = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM "InstitutionMember" im
  WHERE ((im."institutionId" = "InstitutionStudent"."institutionId") AND (im."userId" = (auth.uid())::text) AND (im.status = 'ACTIVE'::text))))));
CREATE POLICY "authenticated_all" ON public."InstitutionTutor" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on MatchRequest" ON public."MatchRequest" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Users view own match requests" ON public."MatchRequest" AS PERMISSIVE FOR SELECT TO public USING (((auth.uid())::text = "studentId"));
CREATE POLICY "authenticated_all" ON public."MatchRequest" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on Message" ON public."Message" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Participants can view messages" ON public."Message" AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM "Session" s
  WHERE ((s.id = "Message"."sessionId") AND ((s."studentId" = (auth.uid())::text) OR (s."partnerId" = (auth.uid())::text))))));
CREATE POLICY "authenticated_all" ON public."Message" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."NewsArticle" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on Notification" ON public."Notification" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Users view own notifications" ON public."Notification" AS PERMISSIVE FOR SELECT TO public USING (((auth.uid())::text = "userId"));
CREATE POLICY "authenticated_all" ON public."Notification" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."NotificationSettings" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."PlatformSettings" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Users manage own likes" ON public."PostLike" AS PERMISSIVE FOR ALL TO public USING (((auth.uid())::text = "userId"));
CREATE POLICY "authenticated_all" ON public."PostLike" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."PushSubscription" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."Report" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on Review" ON public."Review" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Users view own reviews" ON public."Review" AS PERMISSIVE FOR SELECT TO public USING ((((auth.uid())::text = "reviewerId") OR ((auth.uid())::text = "revieweeId")));
CREATE POLICY "authenticated_all" ON public."Review" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on Session" ON public."Session" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Participants can view session" ON public."Session" AS PERMISSIVE FOR SELECT TO public USING ((((auth.uid())::text = "studentId") OR ((auth.uid())::text = "partnerId")));
CREATE POLICY "authenticated_all" ON public."Session" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on StruggleGroup" ON public."StruggleGroup" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Users view struggle groups" ON public."StruggleGroup" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "authenticated_all" ON public."StruggleGroup" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on StudentProfile" ON public."StudentProfile" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Public read StudentProfile" ON public."StudentProfile" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Self update StudentProfile" ON public."StudentProfile" AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid())::text = "userId"));
CREATE POLICY "authenticated_all" ON public."StudentProfile" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."StudentResult" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."StudentResultsAnalysis" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."TeacherSubjectAssignment" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."Testimonial" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on TutorApplication" ON public."TutorApplication" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Users view own tutor applications" ON public."TutorApplication" AS PERMISSIVE FOR SELECT TO public USING (((auth.uid())::text = "userId"));
CREATE POLICY "authenticated_all" ON public."TutorApplication" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on TutorProfile" ON public."TutorProfile" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Public read TutorProfile" ON public."TutorProfile" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Self update TutorProfile" ON public."TutorProfile" AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid())::text = "userId"));
CREATE POLICY "authenticated_all" ON public."TutorProfile" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access on User" ON public."User" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Users can update their own data" ON public."User" AS PERMISSIVE FOR UPDATE TO public USING (((auth.uid())::text = id));
CREATE POLICY "Users can view all users" ON public."User" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "authenticated_all" ON public."User" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."UserCredits" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."UserPreferences" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."_prisma_migrations" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."ai_chat_messages" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."analytics_events" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "allow_service_role_all_keys" ON public."api_keys" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
CREATE POLICY "allow_service_role_insert_logs" ON public."api_usage_logs" AS PERMISSIVE FOR INSERT TO "service_role" WITH CHECK (true);
CREATE POLICY "allow_service_role_select_logs" ON public."api_usage_logs" AS PERMISSIVE FOR SELECT TO "service_role" USING (true);
CREATE POLICY "allow_service_role_all_webhooks" ON public."api_webhooks" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."booking_reminders" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Parties and institution staff view bookings" ON public."bookings" AS PERMISSIVE FOR SELECT TO public USING ((is_admin() OR ((auth.uid())::text = student_id) OR ((auth.uid())::text = tutor_id) OR (EXISTS ( SELECT 1
   FROM ("InstitutionStudent" ist
     JOIN "InstitutionMember" im ON ((im."institutionId" = ist."institutionId")))
  WHERE ((ist."userId" = bookings.student_id) AND (im."userId" = (auth.uid())::text) AND (im.status = 'ACTIVE'::text))))));
CREATE POLICY "Parties update own bookings" ON public."bookings" AS PERMISSIVE FOR UPDATE TO public USING ((is_admin() OR ((auth.uid())::text = student_id) OR ((auth.uid())::text = tutor_id)));
CREATE POLICY "Students insert own bookings" ON public."bookings" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_admin() OR ((auth.uid())::text = student_id)));
CREATE POLICY "authenticated_all" ON public."feedback" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."group_match_requests" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "admin_can_read_institution_applications" ON public."institution_applications" AS PERMISSIVE FOR SELECT TO public USING (is_admin());
CREATE POLICY "admin_can_update_institution_applications" ON public."institution_applications" AS PERMISSIVE FOR UPDATE TO public USING (is_admin());
CREATE POLICY "anon_can_submit_institution_application" ON public."institution_applications" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."institution_documents" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."mash_context" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "allow_read_news_thumbnails" ON public."news_thumbnails" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "allow_service_update_news_thumbnails" ON public."news_thumbnails" AS PERMISSIVE FOR UPDATE TO public USING (true);
CREATE POLICY "allow_service_write_news_thumbnails" ON public."news_thumbnails" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "anon_insert_newsletter" ON public."newsletter_subscribers" AS PERMISSIVE FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "anon_update_newsletter" ON public."newsletter_subscribers" AS PERMISSIVE FOR UPDATE TO "anon" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."newsletter_subscribers" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage payments" ON public."payments" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Users insert own payments" ON public."payments" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_admin() OR ((auth.uid())::text = user_id)));
CREATE POLICY "Users view own payments" ON public."payments" AS PERMISSIVE FOR SELECT TO public USING ((is_admin() OR ((auth.uid())::text = user_id)));
CREATE POLICY "anon_read_plans" ON public."plans" AS PERMISSIVE FOR SELECT TO "anon" USING (true);
CREATE POLICY "authenticated_all" ON public."plans" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."referrals" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage resource purchases" ON public."resource_purchases" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Purchaser and seller view resource purchases" ON public."resource_purchases" AS PERMISSIVE FOR SELECT TO public USING ((is_admin() OR ((auth.uid())::text = user_id) OR (EXISTS ( SELECT 1
   FROM resources r
  WHERE ((r.id = resource_purchases.resource_id) AND (r.seller_id = (auth.uid())::text))))));
CREATE POLICY "Purchasers insert own resource purchases" ON public."resource_purchases" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((is_admin() OR ((auth.uid())::text = user_id)));
CREATE POLICY "anon_count_approved_resources" ON public."resources" AS PERMISSIVE FOR SELECT TO "anon" USING ((status = 'approved'::text));
CREATE POLICY "authenticated_all" ON public."resources" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."seller_earnings" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."session_flags" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "Admins manage session payments" ON public."session_payments" AS PERMISSIVE FOR ALL TO public USING (is_admin());
CREATE POLICY "Student and tutor view session payments" ON public."session_payments" AS PERMISSIVE FOR SELECT TO public USING ((is_admin() OR ((auth.uid())::text = student_id) OR ((auth.uid())::text = tutor_id)));
CREATE POLICY "authenticated_all" ON public."tutor_availability" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public."tutor_payouts" AS PERMISSIVE FOR ALL TO "authenticated" USING (true) WITH CHECK (true);
GRANT SELECT ON public.resources TO anon, authenticated;
COMMIT;
