-- ========================================
-- EDIYFRA PERFORMANCE INDEXES
-- Run after the RLS policies migration
-- ========================================

-- PROFILES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_institution_id ON profiles(institution_id) WHERE institution_id IS NOT NULL;

-- SESSIONS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_student_id ON sessions(student_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_tutor_id ON sessions(tutor_id);

-- MESSAGES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_room_id_created ON messages(room_id, created_at DESC);

-- NOTIFICATIONS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false;

-- BOOKINGS (composite indexes for common query patterns)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_student_id ON bookings(student_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_tutor_id ON bookings(tutor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_date ON bookings(status, date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_tutor_status ON bookings(tutor_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_student_date ON bookings(student_id, date);

-- AI CONVERSATIONS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_conversations_user_date ON ai_conversations(user_id, created_at DESC);

-- CHALLENGE COMPLETIONS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_challenge_completions_user_date ON challenge_completions(user_id, completed_at DESC);

-- NEWS ARTICLES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_published ON news_articles(status, published_at DESC) WHERE status = 'published';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_slug ON news_articles(slug);

-- STUDENT RESULTS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_results_institution ON student_results(institution_id, term, year);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_results_student ON student_results(student_user_id, term, year);

-- PUSH SUBSCRIPTIONS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- COACHING ASSIGNMENTS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coaching_student ON coaching_assignments(student_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coaching_teacher ON coaching_assignments(teacher_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coaching_institution_status ON coaching_assignments(institution_id, status);

-- TUTOR AVAILABILITY
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tutor_availability_tutor ON tutor_availability(tutor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tutor_availability_day ON tutor_availability(tutor_id, day_of_week);

-- INSTITUTION
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_institution_student ON institution_students(institution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_institution_tutor ON institution_tutors(institution_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_institution_member ON institution_members(institution_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_institution_document ON institution_documents(institution_id);

-- RESOURCES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resources_seller ON resources(seller_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_purchases_user ON resource_purchases(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_purchases_resource ON resource_purchases(resource_id);

-- PAYMENTS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status ON payments(status);

-- CREDIT TRANSACTIONS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credits_user ON credit_transactions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credits_created ON credit_transactions(created_at);

-- REFERRALS
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
