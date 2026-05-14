# Timetable Workflow Migration

Run `migration_timetable_workflow.sql` to enable the new workflow:

1. **Timetable code first** - Code generated when creator starts
2. **Faculty code-based preferences** - Faculty enters code to set preferences for that timetable only
3. **Timetable-scoped data** - Batches and preferences linked to specific timetables

## To run (Supabase SQL editor or psql):

```sql
-- Copy and paste contents of migration_timetable_workflow.sql
```

## If constraint drop fails:

If `batches_code_key` or `faculty_preferences_faculty_id_key` doesn't exist, you may need to find the actual constraint name:

```sql
SELECT conname FROM pg_constraint WHERE conrelid = 'batches'::regclass;
SELECT conname FROM pg_constraint WHERE conrelid = 'faculty_preferences'::regclass;
```

Then run: `ALTER TABLE batches DROP CONSTRAINT <actual_name>;`
