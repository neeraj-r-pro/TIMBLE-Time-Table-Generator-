# Timetable Database Save Guide

This guide explains how timetable data is saved to the database when you create a timetable.

## Data Flow

When you complete the timetable generation workflow, the following data is saved to the database:

### 1. **Batches** (Batch Management Step)
- Saved immediately when you add/edit a batch
- Stored in `batches` table
- Fields: name, code, year, semester, stream, student_count, section

### 2. **Subjects** (Subject Assignment Step)
- Saved immediately when you add a subject
- Stored in `subjects` table
- Fields: name, code, batch_id, faculty_id, periods_per_week, type, etc.
- **Important**: You must select a faculty from the dropdown (not type manually)

### 3. **Schedules** (Schedule Timing Step)
- Saved when you complete the timetable generation
- Stored in `schedules` table
- Contains all periods, breaks, and timing for each day

### 4. **Timetable Entries** (Final Generation Step)
- Saved when you click "Complete Setup"
- Stored in `timetable_entries` table
- Contains the actual class schedule for each batch
- Links batches, subjects, faculties, and rooms

## How It Works

### Step-by-Step Process

1. **Basic Info Setup**
   - Collects institution details (not saved to DB yet, used for timetable entries)

2. **Batch Management**
   - ✅ **Saves to DB immediately** when you add/edit batches
   - Each batch gets a database ID

3. **Subject Assignment**
   - ✅ **Saves to DB immediately** when you add subjects
   - Must select faculty from dropdown (faculty must exist in database)
   - Each subject gets a database ID

4. **Schedule Timing**
   - Collects period schedules (saved later)

5. **Timetable Generation**
   - Generates the timetable
   - When you click "Complete Setup":
     - ✅ Saves all schedules to `schedules` table
     - ✅ Saves all timetable entries to `timetable_entries` table
     - Links everything together using database IDs

## Important Notes

### Faculty Selection
- **You must add faculties first** (from "Manage Faculties" page)
- When adding subjects, select faculty from dropdown
- Cannot type faculty name manually - must select from existing faculties

### Room Selection
- Rooms are optional for timetable entries
- If a room name in generated timetable doesn't match any room in database, it will be saved as null
- **Add rooms first** (from "Manage Rooms" page) for proper room assignment

### Batch IDs
- Batches must be saved to database first
- The batch ID from database is used when saving subjects and timetable entries

### Subject IDs
- Subjects must be saved to database first
- The subject ID from database is used when saving timetable entries

## Verification

After completing timetable generation:

1. **Check `batches` table** - Should have all your batches
2. **Check `subjects` table** - Should have all subjects with proper batch_id and faculty_id
3. **Check `schedules` table** - Should have all periods for each day
4. **Check `timetable_entries` table** - Should have all the generated timetable entries

## Troubleshooting

### "Subject doesn't have a valid database ID"
- Make sure you saved the subject (it should have been saved when you added it)
- Check that the subject exists in `subjects` table

### "Faculty not found"
- Make sure you selected a faculty from the dropdown when adding the subject
- Check that the faculty exists in `faculties` table

### "Batch not found"
- Make sure you saved the batch (it should have been saved when you added it)
- Check that the batch exists in `batches` table

### No timetable entries saved
- Check browser console for errors
- Verify all batches, subjects, and faculties are saved
- Make sure you clicked "Complete Setup" after generating the timetable

## Data Structure

### Timetable Entry Structure
```javascript
{
  batchId: "uuid",        // From batches table
  subjectId: "uuid",      // From subjects table
  facultyId: "uuid",      // From faculties table
  roomId: "uuid",         // From rooms table (optional)
  dayOfWeek: "monday",    // Day of week
  periodNumber: 1,        // Period number for the day
  startTime: "09:00:00",  // Start time
  endTime: "10:00:00",    // End time
  academicYear: "2024-2025", // From basic info
  semester: "1"           // Optional
}
```

## Next Steps

After saving the timetable:
- View timetables from "View Timetables" page
- Students and faculty can view their timetables
- You can regenerate and update timetables






