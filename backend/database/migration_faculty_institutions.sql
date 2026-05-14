-- Migration: Add faculty_institutions join table for many-to-many between faculties and institutions

-- 1. Create join table
CREATE TABLE IF NOT EXISTS faculty_institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(faculty_id, institution_id)
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_faculty_institutions_faculty_id ON faculty_institutions(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_institutions_institution_id ON faculty_institutions(institution_id);

-- 3. Backfill from existing faculties.institution_id (single institution per faculty)
INSERT INTO faculty_institutions (faculty_id, institution_id)
SELECT id AS faculty_id, institution_id
FROM faculties
WHERE institution_id IS NOT NULL
ON CONFLICT (faculty_id, institution_id) DO NOTHING;

