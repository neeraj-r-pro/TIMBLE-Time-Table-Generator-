-- Migration: Add institutions - parent for batches, rooms, faculties, subjects, timetables
-- Enables multiple institutions and multiple timetables per institution

-- 1. Create institutions table
CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add institution_id to related tables
ALTER TABLE batches ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE faculties ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL;
ALTER TABLE timetables ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL;

-- 3. Allow same batch code across institutions
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_code_key;
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_code_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_batches_institution_code 
ON batches(institution_id, code) 
WHERE institution_id IS NOT NULL;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_batches_institution_id ON batches(institution_id);
CREATE INDEX IF NOT EXISTS idx_rooms_institution_id ON rooms(institution_id);
CREATE INDEX IF NOT EXISTS idx_faculties_institution_id ON faculties(institution_id);
CREATE INDEX IF NOT EXISTS idx_timetables_institution_id ON timetables(institution_id);
CREATE INDEX IF NOT EXISTS idx_institutions_code ON institutions(code);
