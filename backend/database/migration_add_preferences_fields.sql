-- Migration: Add time_matrix and preferred_subjects to faculty_preferences table
-- Run this migration to add the new fields for time matrix and subject preferences

-- Add time_matrix column (JSONB to store day x hour preferences as a matrix)
-- Format: { "monday": { "09:00": "preferred", "10:30": "avoid", ... }, ... }
ALTER TABLE faculty_preferences 
ADD COLUMN IF NOT EXISTS time_matrix JSONB DEFAULT '{}'::jsonb;

-- Add preferred_subjects column (UUID array to store preferred subject IDs)
ALTER TABLE faculty_preferences 
ADD COLUMN IF NOT EXISTS preferred_subjects UUID[] DEFAULT '{}';

-- Add index on time_matrix for better query performance (optional, for JSONB queries)
CREATE INDEX IF NOT EXISTS idx_faculty_preferences_time_matrix 
ON faculty_preferences USING GIN (time_matrix);


