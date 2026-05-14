# Database Schema

This directory contains the database schema for the Timetable Management System.

## Files

- `schema.sql` - Complete database schema with all tables, indexes, triggers, and functions

## Database Structure

### Core Tables

1. **users** - User authentication and basic information
   - Supports roles: admin, faculty, student
   - Stores email and hashed passwords

2. **faculties** - Faculty member information
   - Linked to users table
   - Stores department, designation, max hours per week

3. **students** - Student records
   - Linked to users and batches tables
   - Stores roll number, class, semester, section

4. **rooms** - Classroom and laboratory spaces
   - Stores capacity, building, floor, equipment

5. **batches** - Class batches/groups
   - Stores year, semester, stream, student count

6. **subjects** - Subjects/courses
   - Linked to batches and faculties
   - Stores periods per week, type (theory/lab/practical)

7. **schedules** - Period schedules
   - Defines daily periods, breaks, and timing

8. **timetable_entries** - Generated timetable entries
   - Links batches, subjects, faculties, and rooms
   - Stores day, time, period information

9. **faculty_preferences** - Faculty scheduling preferences
   - Preferred/unavailable days and times

## Features

- **UUID Primary Keys**: All tables use UUID for better distribution and security
- **Automatic Timestamps**: `created_at` and `updated_at` are automatically managed
- **Foreign Key Constraints**: Ensures data integrity
- **Indexes**: Optimized for common query patterns
- **Triggers**: Automatically update `updated_at` timestamps

## Setup

1. Create a Supabase project
2. Open the SQL Editor
3. Copy and paste the contents of `schema.sql`
4. Execute the SQL script
5. Verify tables were created in the Table Editor

## Notes

- The schema uses PostgreSQL-specific features (arrays, UUID extension)
- All timestamps are stored with timezone information
- The schema includes proper constraints and validations
- Row Level Security (RLS) can be added later for additional security


