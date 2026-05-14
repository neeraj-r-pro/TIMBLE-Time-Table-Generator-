-- Migration: Add semesters and semester_batches tables
-- Semesters group batches within an institution for timetable generation

-- 1. Create semesters table
CREATE TABLE IF NOT EXISTS semesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create semester_batches join table
CREATE TABLE IF NOT EXISTS semester_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(semester_id, batch_id)
);

-- 3. Add subject_slots column to faculty_preferences (JSONB for theory/lab slot selections)
ALTER TABLE faculty_preferences ADD COLUMN IF NOT EXISTS subject_slots JSONB DEFAULT '{}';

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_semesters_institution_id ON semesters(institution_id);
CREATE INDEX IF NOT EXISTS idx_semester_batches_semester_id ON semester_batches(semester_id);
CREATE INDEX IF NOT EXISTS idx_semester_batches_batch_id ON semester_batches(batch_id);

-- 5. Trigger for updated_at
CREATE TRIGGER update_semesters_updated_at BEFORE UPDATE ON semesters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
