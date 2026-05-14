-- Allow the same batch/day/slot in different timetables; scope uniqueness to timetable.
-- Re-saving or publishing a new timetable for the same batch no longer conflicts with other timetables.
--
-- Note: PostgreSQL truncates identifier names to 63 bytes. The original UNIQUE(...) therefore
-- becomes something like: timetable_entries_batch_id_day_of_week_period_number_start__key
-- (not ...start_time_key). We drop by pattern so this works on every install.

-- Drop legacy unique constraint(s) on (batch_id, day_of_week, period_number, start_time) without timetable_id
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname AS constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'timetable_entries'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) LIKE '%batch_id%'
      AND pg_get_constraintdef(c.oid) LIKE '%day_of_week%'
      AND pg_get_constraintdef(c.oid) LIKE '%period_number%'
      AND pg_get_constraintdef(c.oid) LIKE '%start_time%'
      AND pg_get_constraintdef(c.oid) NOT LIKE '%timetable_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.timetable_entries DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
  END LOOP;
END $$;

-- Explicit drops for common truncated / full names (harmless if already removed)
ALTER TABLE public.timetable_entries
  DROP CONSTRAINT IF EXISTS timetable_entries_batch_id_day_of_week_period_number_start_time_key;
ALTER TABLE public.timetable_entries
  DROP CONSTRAINT IF EXISTS timetable_entries_batch_id_day_of_week_period_number_start__key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_timetable_entries_unique_slot_per_timetable
  ON public.timetable_entries (timetable_id, batch_id, day_of_week, period_number, start_time);
