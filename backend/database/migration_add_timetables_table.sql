-- Migration: Add timetables table with unique code
-- This migration creates a timetables table to group timetable entries
-- and adds a timetable_id foreign key to timetable_entries

-- Create timetables table
CREATE TABLE IF NOT EXISTS timetables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    academic_year VARCHAR(50),
    semester VARCHAR(50),
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add timetable_id to timetable_entries
ALTER TABLE timetable_entries 
ADD COLUMN IF NOT EXISTS timetable_id UUID REFERENCES timetables(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_timetable_entries_timetable_id ON timetable_entries(timetable_id);
CREATE INDEX IF NOT EXISTS idx_timetables_code ON timetables(code);
CREATE INDEX IF NOT EXISTS idx_timetables_created_by ON timetables(created_by);

-- Add trigger to update updated_at
CREATE TRIGGER update_timetables_updated_at BEFORE UPDATE ON timetables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

