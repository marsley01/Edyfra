-- Create tutor_availability table
CREATE TABLE IF NOT EXISTS public.tutor_availability (
    id TEXT PRIMARY KEY,
    tutor_id TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT true,
    specific_date DATE,
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    tutor_id TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    education_level TEXT,
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    amount INTEGER NOT NULL DEFAULT 0,
    paystack_reference TEXT,
    decline_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create booking_reminders table
CREATE TABLE IF NOT EXISTS public.booking_reminders (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    channel TEXT NOT NULL DEFAULT 'inapp'
);

-- Create session_flags table
CREATE TABLE IF NOT EXISTS public.session_flags (
    id TEXT PRIMARY KEY,
    tutor_id TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL,
    booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tutor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tutor_availability
-- Tutors can read and write their own availability
CREATE POLICY "Tutors can manage their own availability" 
ON public.tutor_availability FOR ALL 
USING (auth.uid()::text = tutor_id);

-- Anyone (including students) can view tutor availability
CREATE POLICY "Public can view tutor availability" 
ON public.tutor_availability FOR SELECT 
USING (true);

-- RLS Policies for bookings
-- Students can read their own bookings
CREATE POLICY "Students can view their own bookings" 
ON public.bookings FOR SELECT 
USING (auth.uid()::text = student_id);

-- Students can insert bookings
CREATE POLICY "Students can insert their own bookings" 
ON public.bookings FOR INSERT 
WITH CHECK (auth.uid()::text = student_id);

-- Tutors can read bookings where they are the tutor
CREATE POLICY "Tutors can view their own bookings" 
ON public.bookings FOR SELECT 
USING (auth.uid()::text = tutor_id);

-- Tutors can update bookings (e.g., to accept/decline)
CREATE POLICY "Tutors can update their own bookings" 
ON public.bookings FOR UPDATE 
USING (auth.uid()::text = tutor_id);

-- RLS Policies for booking_reminders
-- Users can view their own reminders
CREATE POLICY "Users can view their own reminders" 
ON public.booking_reminders FOR SELECT 
USING (auth.uid()::text = user_id);

-- RLS Policies for session_flags
-- Only tutors can view their own flags, admin can view all
CREATE POLICY "Tutors can view their own flags" 
ON public.session_flags FOR SELECT 
USING (auth.uid()::text = tutor_id);

-- Admins can do everything (Bypass RLS via service role key is standard)
