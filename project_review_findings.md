# Project Review Findings: Timetable Management System

This document outlines the findings from a thorough study of the project, including logic mistakes, inconsistencies, unnecessary code, and suggested database improvements.

## 1. Logic Mistakes & Inconsistencies

### Database Schema Inconsistencies
- **Missing `institution_id` in `subjects`**: While other entities (batches, rooms, faculties) have been migrated to include `institution_id`, the `subjects` table is missing it. The backend currently works around this by fetching all batch IDs for an institution and querying subjects by those IDs, which is inefficient.
- **Global `schedules` table**: The `schedules` table (store of day/period timings) lacks an `institution_id` or `timetable_id`. This means timings are shared globally across all institutions, which will cause conflicts in a multi-tenant environment.
- **Duplicate Schedules**: In `TimetableGeneration.jsx`, schedules are saved every time a timetable is finalized. Since there's no unique constraint or linking to a specific timetable in the `schedules` table, this leads to redundant rows.

### Timetable Generation Logic
- **Brittle Time Normalization**: The `isSlotAvoidedByFaculty` function in `src/utils/timetableGenerator.js` uses regex and string replacement to normalize times for comparison. This is prone to errors if time formats vary slightly (e.g., "9:00" vs "09:00" vs "9:00:00").
- **Confusing Room Fallback**: If a room is not assigned, the generator falls back to using the **batch name** as the room name. This is misleading for users who might think the class is in a specific room named after the batch.
- **Hardcoded Statistics**: The "Faculty Load" statistic in the generation results is hardcoded to "Balanced" and does not reflect actual data.

### Data Type Inconsistencies
- **Academic Year/Semester**: In the `students` table, `semester` is an INTEGER. In the `timetables` and `timetable_entries` tables, it is a VARCHAR. This inconsistency can lead to issues during data joining or filtering.

---

## 2. Suggested Changes & Improvements

### Algorithm Enhancements
- **Capacity Validation**: Use the `student_count` in the `batches` table to ensure that assigned rooms have sufficient `capacity`. Currently, the algorithm only checks if the room is a "Lab" or "Classroom".
- **Structured Time Handling**: Use a more robust time comparison library or standardized ISO-like strings instead of manual string manipulation in the generator.

### UI/UX Improvements
- **Subject Management**: The `ManageSubjects.jsx` list view only shows subject name and code. It should include `type` (Theory/Lab), `periods per week`, and `assigned faculty` for better overview.
- **Bulk Operations**: Implement bulk delete or bulk assign for subjects to improve administrative efficiency.

---

## 3. Unnecessary Code & Files

### Backend
- **Legacy Endpoint**: The `/api/timetable/:batchId` route in `server.js` is a legacy holdover and should be removed to clean up the API.
- **Unused Migrations**: Some older migration files might be redundant now that a consolidated `schema.sql` exists, though they are useful for history.

### Frontend
- **Placeholder Functions**: The `exportTimetable` function in `TimetableGeneration.jsx` is just an alert. Actual PDF/Excel export logic is missing.
- **Unused Imports**: Several components have minor unused imports that can be linted/cleaned.

---

## 4. Suggested Database Changes

### Schema Updates
- **[IMPORTANT]** Add `institution_id` (UUID, FK) to the `subjects` table.
- **[IMPORTANT]** Add `institution_id` or `timetable_id` to the `schedules` table to isolate timings per institution/timetable.
- **Normalization**: Consider moving `periods_per_week` and `consecutive_periods` into a separate `subject_configuration` or `batch_subject` table if subjects are shared across batches (though currently, they seem batch-specific).

### Indexing
- Add a composite index on `timetable_entries(timetable_id, day_of_week, period_number)` to speed up full timetable rendering.

---

## 5. Removal Candidates

- `backend/routes/timetable_management.js`: Some internal helper functions like `generateTimetableCode` could be moved to a `utils` file to keep routes clean.
- `DUMMY_DATA_REMOVAL.md`: This file seems to be a guide for a task already completed; consider archiving or deleting if no longer needed.
