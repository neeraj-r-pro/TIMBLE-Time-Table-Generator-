# Database Migration: Add Time Matrix and Subject Preferences

This migration adds new fields to the `faculty_preferences` table to support:
- Time matrix preferences (day × hour preferences as a JSONB matrix)
- Subject preferences (array of preferred subject IDs)

## Running the Migration

1. Open your Supabase SQL Editor
2. Copy and paste the contents of `migration_add_preferences_fields.sql`
3. Execute the SQL script
4. Verify the new columns were added in the Table Editor

## New Fields

### `time_matrix` (JSONB)
Stores time preferences as a matrix where:
- Keys are day names (lowercase: "monday", "tuesday", etc.)
- Values are objects where:
  - Keys are time slot keys (format: "HH:MM-HH:MM")
  - Values are preference types: "preferred" or "avoid"

Example:
```json
{
  "monday": {
    "09:00-10:30": "preferred",
    "14:00-15:30": "avoid"
  },
  "tuesday": {
    "09:00-10:30": "preferred"
  }
}
```

### `preferred_subjects` (UUID[])
Array of subject IDs that the faculty prefers to teach.

Example: `['uuid1', 'uuid2', 'uuid3']`

## Backward Compatibility

The migration uses `ADD COLUMN IF NOT EXISTS`, so it's safe to run multiple times. Existing preferences will have empty defaults (`{}` for time_matrix, `[]` for preferred_subjects).

## Notes

- The `time_matrix` field uses JSONB for flexible storage and querying
- An index is created on `time_matrix` for better query performance
- Existing preference records will automatically get the new fields with default empty values


