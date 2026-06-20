-- ============================================
-- EDYFRA INSTITUTION SYSTEM V2
-- Adds v2 columns to Institution + creates related tables
-- Idempotent: safe to re-run multiple times
-- ============================================

-- ============================================
-- 1. ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE "InstitutionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SchoolType" AS ENUM ('PRIMARY', 'SECONDARY', 'COLLEGE', 'UNIVERSITY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Curriculum" AS ENUM ('CBC', 'EIGHT_FOUR_FOUR', 'IGCSE', 'MIXED', 'UNIVERSITY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AdminTitle" AS ENUM ('PRINCIPAL', 'DEPUTY', 'HOD', 'REGISTRAR', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InstitutionPlan" AS ENUM ('STARTER', 'GROWTH', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ResultFlag" AS ENUM ('CRITICAL', 'AT_RISK', 'MONITORING', 'ON_TRACK', 'EXCELLENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ResultTrend" AS ENUM ('IMPROVING', 'DECLINING', 'STABLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OverallStatus" AS ENUM ('RED', 'YELLOW', 'GREEN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InstitutionRole" AS ENUM ('INSTITUTION_ADMIN', 'INSTITUTION_DEPUTY', 'INSTITUTION_TEACHER', 'INSTITUTION_STUDENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CoachingStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InvitationRole" AS ENUM ('TEACHER', 'STUDENT', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ActivityType" AS ENUM (
    'STUDENT_JOINED',
    'STUDENT_REMOVED',
    'TEACHER_INVITED',
    'TEACHER_JOINED',
    'TEACHER_REMOVED',
    'RESULTS_UPLOADED',
    'REPORT_GENERATED',
    'COACHING_ASSIGNED',
    'COACHING_BOOKED',
    'ADMIN_ADDED',
    'SETTINGS_UPDATED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- 2. INSTITUTION TABLE V2 COLUMNS
-- ============================================

ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "status" "InstitutionStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "schoolType" "SchoolType";
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "curriculum" "Curriculum";
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "county" TEXT;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "subCounty" TEXT;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "studentCount" INTEGER;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "adminName" TEXT;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "adminTitle" "AdminTitle";
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "adminPhone" TEXT;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "adminEmail" TEXT;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "primaryAdminUserId" TEXT;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "planTier" "InstitutionPlan";
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "currentTermId" TEXT;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "approvedByUserId" TEXT;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "motto" TEXT;
ALTER TABLE "Institution" ADD COLUMN IF NOT EXISTS "address" TEXT;

CREATE INDEX IF NOT EXISTS "Institution_status_idx" ON "Institution"("status");
CREATE INDEX IF NOT EXISTS "Institution_primaryAdminUserId_idx" ON "Institution"("primaryAdminUserId");
CREATE INDEX IF NOT EXISTS "Institution_county_idx" ON "Institution"("county");

-- ============================================
-- 3. INSTITUTION-RELATED TABLES
-- ============================================

-- InstitutionStaff
CREATE TABLE IF NOT EXISTS "InstitutionStaff" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'ADMIN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "InstitutionStaff_userId_key" ON "InstitutionStaff"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "InstitutionStaff_email_key" ON "InstitutionStaff"("email");
CREATE INDEX IF NOT EXISTS "InstitutionStaff_institutionId_idx" ON "InstitutionStaff"("institutionId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstitutionStaff_institutionId_fkey') THEN
    ALTER TABLE "InstitutionStaff" ADD CONSTRAINT "InstitutionStaff_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- InstitutionStudent
CREATE TABLE IF NOT EXISTS "InstitutionStudent" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "studentIdStr" TEXT,
  "classYear" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "InstitutionStudent_userId_key" ON "InstitutionStudent"("userId");
CREATE INDEX IF NOT EXISTS "InstitutionStudent_institutionId_idx" ON "InstitutionStudent"("institutionId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstitutionStudent_institutionId_fkey') THEN
    ALTER TABLE "InstitutionStudent" ADD CONSTRAINT "InstitutionStudent_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstitutionStudent_userId_fkey') THEN
    ALTER TABLE "InstitutionStudent" ADD CONSTRAINT "InstitutionStudent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- InstitutionTutor
CREATE TABLE IF NOT EXISTS "InstitutionTutor" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "InstitutionTutor_institutionId_userId_key" ON "InstitutionTutor"("institutionId", "userId");
CREATE INDEX IF NOT EXISTS "InstitutionTutor_institutionId_idx" ON "InstitutionTutor"("institutionId");
CREATE INDEX IF NOT EXISTS "InstitutionTutor_userId_idx" ON "InstitutionTutor"("userId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstitutionTutor_institutionId_fkey') THEN
    ALTER TABLE "InstitutionTutor" ADD CONSTRAINT "InstitutionTutor_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstitutionTutor_userId_fkey') THEN
    ALTER TABLE "InstitutionTutor" ADD CONSTRAINT "InstitutionTutor_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- InstitutionMember
CREATE TABLE IF NOT EXISTS "InstitutionMember" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'STAFF',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "InstitutionMember_institutionId_userId_key" ON "InstitutionMember"("institutionId", "userId");
CREATE INDEX IF NOT EXISTS "InstitutionMember_institutionId_idx" ON "InstitutionMember"("institutionId");
CREATE INDEX IF NOT EXISTS "InstitutionMember_userId_idx" ON "InstitutionMember"("userId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstitutionMember_institutionId_fkey') THEN
    ALTER TABLE "InstitutionMember" ADD CONSTRAINT "InstitutionMember_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstitutionMember_userId_fkey') THEN
    ALTER TABLE "InstitutionMember" ADD CONSTRAINT "InstitutionMember_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- institution_documents (already snake_case via @@map)
CREATE TABLE IF NOT EXISTS "institution_documents" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "filePath" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "institution_documents_institutionId_idx" ON "institution_documents"("institutionId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'institution_documents_institutionId_fkey') THEN
    ALTER TABLE "institution_documents" ADD CONSTRAINT "institution_documents_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- InstitutionAdmin
CREATE TABLE IF NOT EXISTS "InstitutionAdmin" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" "AdminTitle" NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "InstitutionAdmin_institutionId_userId_key" ON "InstitutionAdmin"("institutionId", "userId");
CREATE INDEX IF NOT EXISTS "InstitutionAdmin_institutionId_idx" ON "InstitutionAdmin"("institutionId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstitutionAdmin_institutionId_fkey') THEN
    ALTER TABLE "InstitutionAdmin" ADD CONSTRAINT "InstitutionAdmin_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstitutionAdmin_userId_fkey') THEN
    ALTER TABLE "InstitutionAdmin" ADD CONSTRAINT "InstitutionAdmin_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- AcademicTerm
CREATE TABLE IF NOT EXISTS "AcademicTerm" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL,
  "term" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "holidayStart" TIMESTAMP(3),
  "holidayEnd" TIMESTAMP(3),
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicTerm_institutionId_term_year_key" ON "AcademicTerm"("institutionId", "term", "year");
CREATE INDEX IF NOT EXISTS "AcademicTerm_institutionId_isCurrent_idx" ON "AcademicTerm"("institutionId", "isCurrent");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AcademicTerm_institutionId_fkey') THEN
    ALTER TABLE "AcademicTerm" ADD CONSTRAINT "AcademicTerm_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- StudentResult
CREATE TABLE IF NOT EXISTS "StudentResult" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL,
  "studentUserId" TEXT NOT NULL,
  "admissionNumber" TEXT NOT NULL,
  "studentName" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "marks" DOUBLE PRECISION NOT NULL,
  "grade" TEXT,
  "term" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "form" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "StudentResult_institutionId_term_year_idx" ON "StudentResult"("institutionId", "term", "year");
CREATE INDEX IF NOT EXISTS "StudentResult_studentUserId_term_year_idx" ON "StudentResult"("studentUserId", "term", "year");
CREATE INDEX IF NOT EXISTS "StudentResult_admissionNumber_institutionId_idx" ON "StudentResult"("admissionNumber", "institutionId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentResult_institutionId_fkey') THEN
    ALTER TABLE "StudentResult" ADD CONSTRAINT "StudentResult_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentResult_studentUserId_fkey') THEN
    ALTER TABLE "StudentResult" ADD CONSTRAINT "StudentResult_studentUserId_fkey"
      FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentResult_uploadedById_fkey') THEN
    ALTER TABLE "StudentResult" ADD CONSTRAINT "StudentResult_uploadedById_fkey"
      FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- StudentResultsAnalysis
CREATE TABLE IF NOT EXISTS "StudentResultsAnalysis" (
  "id" TEXT PRIMARY KEY,
  "studentResultId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "term" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "studentUserId" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "marks" DOUBLE PRECISION NOT NULL,
  "lastTermMarks" DOUBLE PRECISION,
  "trend" "ResultTrend" NOT NULL,
  "flag" "ResultFlag" NOT NULL,
  "overallStatus" "OverallStatus" NOT NULL,
  "aiInsight" TEXT,
  "aiGeneratedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "StudentResultsAnalysis_studentResultId_key" ON "StudentResultsAnalysis"("studentResultId");
CREATE INDEX IF NOT EXISTS "StudentResultsAnalysis_institutionId_term_year_idx" ON "StudentResultsAnalysis"("institutionId", "term", "year");
CREATE INDEX IF NOT EXISTS "StudentResultsAnalysis_studentUserId_term_year_idx" ON "StudentResultsAnalysis"("studentUserId", "term", "year");
CREATE INDEX IF NOT EXISTS "StudentResultsAnalysis_flag_idx" ON "StudentResultsAnalysis"("flag");
CREATE INDEX IF NOT EXISTS "StudentResultsAnalysis_overallStatus_idx" ON "StudentResultsAnalysis"("overallStatus");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentResultsAnalysis_studentResultId_fkey') THEN
    ALTER TABLE "StudentResultsAnalysis" ADD CONSTRAINT "StudentResultsAnalysis_studentResultId_fkey"
      FOREIGN KEY ("studentResultId") REFERENCES "StudentResult"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentResultsAnalysis_studentUserId_fkey') THEN
    ALTER TABLE "StudentResultsAnalysis" ADD CONSTRAINT "StudentResultsAnalysis_studentUserId_fkey"
      FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- CoachingAssignment
CREATE TABLE IF NOT EXISTS "CoachingAssignment" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL,
  "studentUserId" TEXT NOT NULL,
  "teacherUserId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "schedule" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "isHoliday" BOOLEAN NOT NULL DEFAULT false,
  "sessionsAttended" INTEGER NOT NULL DEFAULT 0,
  "sessionsScheduled" INTEGER NOT NULL DEFAULT 0,
  "status" "CoachingStatus" NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CoachingAssignment_institutionId_status_idx" ON "CoachingAssignment"("institutionId", "status");
CREATE INDEX IF NOT EXISTS "CoachingAssignment_studentUserId_idx" ON "CoachingAssignment"("studentUserId");
CREATE INDEX IF NOT EXISTS "CoachingAssignment_teacherUserId_idx" ON "CoachingAssignment"("teacherUserId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CoachingAssignment_institutionId_fkey') THEN
    ALTER TABLE "CoachingAssignment" ADD CONSTRAINT "CoachingAssignment_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CoachingAssignment_studentUserId_fkey') THEN
    ALTER TABLE "CoachingAssignment" ADD CONSTRAINT "CoachingAssignment_studentUserId_fkey"
      FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CoachingAssignment_teacherUserId_fkey') THEN
    ALTER TABLE "CoachingAssignment" ADD CONSTRAINT "CoachingAssignment_teacherUserId_fkey"
      FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- InstitutionActivity
CREATE TABLE IF NOT EXISTS "InstitutionActivity" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL,
  "type" "ActivityType" NOT NULL,
  "actorUserId" TEXT,
  "targetUserId" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "InstitutionActivity_institutionId_createdAt_idx" ON "InstitutionActivity"("institutionId", "createdAt");
CREATE INDEX IF NOT EXISTS "InstitutionActivity_institutionId_type_idx" ON "InstitutionActivity"("institutionId", "type");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstitutionActivity_institutionId_fkey') THEN
    ALTER TABLE "InstitutionActivity" ADD CONSTRAINT "InstitutionActivity_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstitutionActivity_actorUserId_fkey') THEN
    ALTER TABLE "InstitutionActivity" ADD CONSTRAINT "InstitutionActivity_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstitutionActivity_targetUserId_fkey') THEN
    ALTER TABLE "InstitutionActivity" ADD CONSTRAINT "InstitutionActivity_targetUserId_fkey"
      FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- TeacherSubjectAssignment
CREATE TABLE IF NOT EXISTS "TeacherSubjectAssignment" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL,
  "teacherUserId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "formYear" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "TeacherSubjectAssignment_institutionId_teacherUserId_subject_key"
  ON "TeacherSubjectAssignment"("institutionId", "teacherUserId", "subject");
CREATE INDEX IF NOT EXISTS "TeacherSubjectAssignment_institutionId_idx" ON "TeacherSubjectAssignment"("institutionId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherSubjectAssignment_institutionId_fkey') THEN
    ALTER TABLE "TeacherSubjectAssignment" ADD CONSTRAINT "TeacherSubjectAssignment_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeacherSubjectAssignment_teacherUserId_fkey') THEN
    ALTER TABLE "TeacherSubjectAssignment" ADD CONSTRAINT "TeacherSubjectAssignment_teacherUserId_fkey"
      FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- InstitutionInvitation
CREATE TABLE IF NOT EXISTS "InstitutionInvitation" (
  "id" TEXT PRIMARY KEY,
  "institutionId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "InvitationRole" NOT NULL,
  "subjects" TEXT[],
  "formYear" TEXT,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "token" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "InstitutionInvitation_token_key" ON "InstitutionInvitation"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "InstitutionInvitation_institutionId_email_role_key"
  ON "InstitutionInvitation"("institutionId", "email", "role");
CREATE INDEX IF NOT EXISTS "InstitutionInvitation_institutionId_status_idx" ON "InstitutionInvitation"("institutionId", "status");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstitutionInvitation_institutionId_fkey') THEN
    ALTER TABLE "InstitutionInvitation" ADD CONSTRAINT "InstitutionInvitation_institutionId_fkey"
      FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstitutionInvitation_invitedById_fkey') THEN
    ALTER TABLE "InstitutionInvitation" ADD CONSTRAINT "InstitutionInvitation_invitedById_fkey"
      FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 4. BACKFILL
-- ============================================

-- Mark any existing Institution as ACTIVE (they were pre-v2)
UPDATE "Institution"
SET "status" = 'ACTIVE'
WHERE "status" = 'PENDING'
  AND "approvedAt" IS NULL
  AND "createdAt" < NOW() - INTERVAL '1 day';

-- ============================================
-- 5. VERIFY
-- ============================================
DO $$
DECLARE
  missing TEXT;
BEGIN
  SELECT string_agg(column_name, ', ')
    INTO missing
  FROM (VALUES
    ('status'), ('schoolType'), ('curriculum'), ('county'), ('subCounty'),
    ('studentCount'), ('adminName'), ('adminTitle'), ('adminPhone'),
    ('adminEmail'), ('primaryAdminUserId'), ('planTier'), ('currentTermId'),
    ('approvedAt'), ('approvedByUserId'), ('motto'), ('address')
  ) AS expected(column_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Institution'
      AND column_name = expected.column_name
  );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Institution still missing columns: %', missing;
  ELSE
    RAISE NOTICE 'All 17 Institution v2 columns present';
  END IF;
END $$;
