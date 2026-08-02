-- Migration to add missing username column to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'User_username_key'
    ) THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_username_key" UNIQUE ("username");
    END IF;
END $$;
