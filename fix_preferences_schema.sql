-- Robust SQL to fix/update faculty_preferences table
-- Run this in your Supabase SQL Editor

-- 1. Create the table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS public.faculty_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
    timetable_id UUID REFERENCES public.timetables(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add columns one by one if they don't exist (Idempotent)
DO $$ 
BEGIN 
    -- preferred_days
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faculty_preferences' AND column_name='preferred_days') THEN
        ALTER TABLE public.faculty_preferences ADD COLUMN preferred_days JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- preferred_times
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faculty_preferences' AND column_name='preferred_times') THEN
        ALTER TABLE public.faculty_preferences ADD COLUMN preferred_times JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- unavailable_days
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faculty_preferences' AND column_name='unavailable_days') THEN
        ALTER TABLE public.faculty_preferences ADD COLUMN unavailable_days JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- unavailable_times
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faculty_preferences' AND column_name='unavailable_times') THEN
        ALTER TABLE public.faculty_preferences ADD COLUMN unavailable_times JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- time_matrix
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faculty_preferences' AND column_name='time_matrix') THEN
        ALTER TABLE public.faculty_preferences ADD COLUMN time_matrix JSONB DEFAULT '{}'::jsonb;
    ELSE
        ALTER TABLE public.faculty_preferences ALTER COLUMN time_matrix TYPE JSONB USING time_matrix::jsonb;
    END IF;

    -- preferred_subjects
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faculty_preferences' AND column_name='preferred_subjects') THEN
        ALTER TABLE public.faculty_preferences ADD COLUMN preferred_subjects JSONB DEFAULT '{}'::jsonb;
    ELSE
        ALTER TABLE public.faculty_preferences ALTER COLUMN preferred_subjects TYPE JSONB USING preferred_subjects::jsonb;
    END IF;

    -- notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='faculty_preferences' AND column_name='notes') THEN
        ALTER TABLE public.faculty_preferences ADD COLUMN notes TEXT;
    END IF;

END $$;

-- 3. Add unique constraint to prevent duplicates
ALTER TABLE public.faculty_preferences 
    DROP CONSTRAINT IF EXISTS faculty_timetable_unique;

ALTER TABLE public.faculty_preferences 
    ADD CONSTRAINT faculty_timetable_unique UNIQUE (faculty_id, timetable_id);

-- 4. Enable RLS and Policies (Only if not already set)
ALTER TABLE public.faculty_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.faculty_preferences;
CREATE POLICY "Enable read access for all users" ON public.faculty_preferences FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.faculty_preferences;
CREATE POLICY "Enable insert for authenticated users only" ON public.faculty_preferences FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.faculty_preferences;
CREATE POLICY "Enable update for authenticated users only" ON public.faculty_preferences FOR UPDATE USING (true);
