-- Migration: Add workflow_state to timetables for persistence
-- This allows storing the wizard progress on the server

ALTER TABLE timetables 
ADD COLUMN IF NOT EXISTS workflow_state JSONB DEFAULT '{}'::jsonb;

-- Update description to reflect it's for draft persistence
COMMENT ON COLUMN timetables.workflow_state IS 'Stores the current step and data of the timetable generation wizard';
