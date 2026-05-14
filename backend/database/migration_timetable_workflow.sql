-- Migration: Timetable-first workflow - code generated first, faculty preferences per timetable
-- Run this migration for the new workflow

-- 1. Add config to timetables (schedule, breakSettings - saved as creator progresses)
ALTER TABLE timetables 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- 2. Add timetable_id to batches (batches belong to a timetable)
ALTER TABLE batches 
ADD COLUMN IF NOT EXISTS timetable_id UUID REFERENCES timetables(id) ON DELETE CASCADE;

-- Allow same batch code across different timetables
-- Try common constraint names (PostgreSQL/Supabase)
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_code_key;
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_code_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_batches_timetable_code 
ON batches(timetable_id, code) 
WHERE timetable_id IS NOT NULL;

-- 3. Add timetable_id to faculty_preferences (preferences are per timetable)
ALTER TABLE faculty_preferences 
ADD COLUMN IF NOT EXISTS timetable_id UUID REFERENCES timetables(id) ON DELETE CASCADE;

-- Drop old unique constraint on faculty_id, add composite
ALTER TABLE faculty_preferences DROP CONSTRAINT IF EXISTS faculty_preferences_faculty_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_preferences_faculty_timetable 
ON faculty_preferences(faculty_id, timetable_id) 
WHERE timetable_id IS NOT NULL;

-- For faculty without timetable (legacy), allow one row per faculty
CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_preferences_faculty_legacy 
ON faculty_preferences(faculty_id) 
WHERE timetable_id IS NULL;

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_batches_timetable_id ON batches(timetable_id);
CREATE INDEX IF NOT EXISTS idx_faculty_preferences_timetable_id ON faculty_preferences(timetable_id);
