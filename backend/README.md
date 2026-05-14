# Timetable Management System - Backend API

This is the backend API for the Timetable Management System built with Express.js and Supabase (PostgreSQL).

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### 3. Database Setup

1. Create a new Supabase project at https://supabase.com
2. Run the SQL schema from `database/schema.sql` in your Supabase SQL Editor
3. Update your `.env` file with the Supabase credentials

### 4. Run the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000` (or the PORT specified in your `.env` file).

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Faculties

- `GET /api/faculties` - Get all faculties
- `GET /api/faculties/:id` - Get single faculty
- `POST /api/faculties` - Create faculty
- `PUT /api/faculties/:id` - Update faculty
- `DELETE /api/faculties/:id` - Delete faculty

### Rooms

- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/:id` - Get single room
- `POST /api/rooms` - Create room
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room

### Students

- `GET /api/students` - Get all students (query: `?class=Computer Science`)
- `GET /api/students/:id` - Get single student
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Batches

- `GET /api/batches` - Get all batches
- `GET /api/batches/:id` - Get single batch
- `POST /api/batches` - Create batch
- `PUT /api/batches/:id` - Update batch
- `DELETE /api/batches/:id` - Delete batch

### Subjects

- `GET /api/subjects` - Get all subjects (query: `?batchId=uuid`)
- `GET /api/subjects/:id` - Get single subject
- `POST /api/subjects` - Create subject
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Delete subject

### Schedules

- `GET /api/schedules` - Get all schedules (query: `?dayOfWeek=monday`)
- `POST /api/schedules` - Create schedules (bulk)
- `DELETE /api/schedules/day/:dayOfWeek` - Delete schedules for a day

### Timetables

- `GET /api/timetables` - Get all timetable entries (queries: `?batchId=uuid&facultyId=uuid&dayOfWeek=monday`)
- `GET /api/timetables/batch/:batchId` - Get timetable for a batch
- `GET /api/timetables/faculty/:facultyId` - Get timetable for a faculty
- `POST /api/timetables` - Create timetable entry
- `POST /api/timetables/bulk` - Create multiple timetable entries
- `PUT /api/timetables/:id` - Update timetable entry
- `DELETE /api/timetables/:id` - Delete timetable entry
- `DELETE /api/timetables/batch/:batchId` - Delete all entries for a batch

### Preferences

- `GET /api/preferences/faculty/:facultyId` - Get faculty preferences
- `POST /api/preferences/faculty/:facultyId` - Create/update faculty preferences

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Example Requests

### Register User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "name": "Admin User",
    "role": "admin"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "role": "admin"
  }'
```

### Create Faculty (with auth token)

```bash
curl -X POST http://localhost:5000/api/faculties \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "name": "Dr. John Smith",
    "email": "john.smith@university.edu",
    "phone": "+1234567890",
    "department": "Computer Science",
    "designation": "Professor",
    "maxHoursPerWeek": 20
  }'
```

## Database Schema

The database schema includes the following tables:

- `users` - User authentication and basic info
- `faculties` - Faculty members
- `students` - Student records
- `rooms` - Classroom and lab spaces
- `batches` - Class batches/groups
- `subjects` - Subjects/courses
- `schedules` - Period schedules
- `timetable_entries` - Generated timetable entries
- `faculty_preferences` - Faculty scheduling preferences

See `database/schema.sql` for the complete schema definition.

## Error Handling

All endpoints return JSON responses. Errors follow this format:

```json
{
  "error": "Error message",
  "details": "Detailed error information (in development)"
}
```

## Development

- The server uses Express.js with Supabase as the database
- JWT tokens are used for authentication
- Passwords are hashed using bcryptjs
- CORS is enabled for frontend communication

## Notes

- Make sure to set a strong `JWT_SECRET` in production
- The service role key should be kept secure and never exposed to the frontend
- All timestamps are stored in UTC with timezone information


