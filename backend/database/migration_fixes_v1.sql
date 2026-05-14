-- Migration: Fix identified issues in schedules, students, and indexing
-- 1. Update schedules table for multi-tenancy
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS timetable_id UUID REFERENCES timetables(id) ON DELETE CASCADE;

-- Add unique constraint to prevent duplicates within a timetable/institution
-- First, clean up duplicates if any (manual step usually, but for migration we ensure clean start)
-- ALTER TABLE schedules DROP CONSTRAINT IF EXISTS unique_schedule_slot;
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_schedule_slot ON schedules (institution_id, timetable_id, day_of_week, period_name, start_time) 
-- WHERE institution_id IS NOT NULL AND timetable_id IS NOT NULL;

-- 2. Standardize students.semester type to match timetables.semester
ALTER TABLE students ALTER COLUMN semester TYPE VARCHAR(50);

-- 3. Add composite index for timetable performance
CREATE INDEX IF NOT EXISTS idx_timetable_entries_render 
ON timetable_entries(timetable_id, day_of_week, period_number);

-- 4. Add institution_id to subjects (missing in previous migrations)
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_subjects_institution_id ON subjects(institution_id);
