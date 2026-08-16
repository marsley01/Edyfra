-- Add meeting_url to bookings for Google Meet links
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS meeting_url TEXT;
