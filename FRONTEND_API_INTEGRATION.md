# Frontend API Integration Guide

The frontend has been updated to connect to the backend API. Here's what's been changed and how to use it.

## What's Been Updated

### 1. API Service (`src/services/api.js`)
- Created a centralized API service for all backend calls
- Handles authentication tokens automatically
- Provides easy-to-use functions for all endpoints

### 2. Updated Components
- ✅ **ManageFaculties** - Now fetches and saves to database
- ✅ **ManageRooms** - Now fetches and saves to database  
- ✅ **Login** - Now authenticates with backend API
- ⏳ **ManageStudents** - Still needs update (can be done similarly)
- ⏳ **BatchManagement** - Still needs update
- ⏳ **SubjectAssignment** - Still needs update

## Setup

### 1. Environment Variable (Optional)

Create a `.env` file in the `timetable` directory (frontend root):

```env
VITE_API_URL=http://localhost:5000/api
```

If you don't set this, it defaults to `http://localhost:5000/api`.

### 2. Make Sure Backend is Running

```bash
cd timetable/backend
npm run dev
```

The backend should be running on `http://localhost:5000`.

### 3. Authentication

Before using the app, you need to:

1. **Register an admin user** (first time only):
   - You can use the API directly or create a simple registration form
   - Or use curl:
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@example.com",
       "password": "admin123",
       "name": "Admin User",
       "role": "admin"
     }'
   ```

2. **Login** through the frontend:
   - Go to `/login`
   - Select "Creator" role (maps to admin)
   - Enter your email and password
   - The token will be stored automatically

## How It Works

### API Service Usage

```javascript
import { facultiesAPI } from '../../services/api';

// Get all faculties
const faculties = await facultiesAPI.getAll();

// Create a faculty
await facultiesAPI.create({
  name: 'Dr. John Doe',
  email: 'john@example.com',
  department: 'Computer Science',
  designation: 'Professor',
  maxHoursPerWeek: 20
});

// Update a faculty
await facultiesAPI.update(facultyId, { name: 'New Name' });

// Delete a faculty
await facultiesAPI.delete(facultyId);
```

### Authentication Token

The API service automatically:
- Stores the JWT token in `localStorage` after login
- Includes the token in all API requests
- Handles token expiration (you may want to add refresh logic)

## Testing

1. **Start the backend:**
   ```bash
   cd timetable/backend
   npm run dev
   ```

2. **Start the frontend:**
   ```bash
   cd timetable
   npm run dev
   ```

3. **Test the flow:**
   - Register/login as admin
   - Go to "Manage Faculties"
   - Add a new faculty
   - Check Supabase - you should see the data!

## Troubleshooting

### "Failed to load faculties" error

- Check that backend is running on port 5000
- Check browser console for CORS errors
- Verify you're logged in (token exists in localStorage)
- Check backend logs for errors

### Data not saving

- Check browser console for errors
- Verify the API endpoint is correct
- Check backend logs
- Ensure you're authenticated (token in localStorage)

### CORS errors

- Make sure `CORS_ORIGIN` in backend `.env` matches your frontend URL
- Default is `http://localhost:5173` (Vite default)

## Next Steps

To update remaining components:

1. **ManageStudents** - Follow the same pattern as ManageFaculties
2. **BatchManagement** - Use `batchesAPI` from the service
3. **SubjectAssignment** - Use `subjectsAPI` and `batchesAPI`
4. **Timetable Generation** - Use `timetablesAPI.createBulk()`

## API Endpoints Available

All endpoints are available through the API service:

- `authAPI` - register, login, logout
- `facultiesAPI` - CRUD operations
- `roomsAPI` - CRUD operations
- `studentsAPI` - CRUD operations
- `batchesAPI` - CRUD operations
- `subjectsAPI` - CRUD operations
- `schedulesAPI` - Schedule management
- `timetablesAPI` - Timetable operations
- `preferencesAPI` - Faculty preferences

See `src/services/api.js` for all available methods.






