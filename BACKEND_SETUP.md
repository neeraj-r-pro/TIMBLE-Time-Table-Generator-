# Backend Setup Guide

This guide will help you set up the backend and database for the Timetable Management System.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Supabase account (free tier works)

## Step 1: Install Backend Dependencies

```bash
cd timetable/backend
npm install
```

This will install all required packages:
- Express.js (web framework)
- Supabase client
- bcryptjs (password hashing)
- jsonwebtoken (JWT authentication)
- cors (Cross-Origin Resource Sharing)
- dotenv (environment variables)

## Step 2: Set Up Supabase Database

### 2.1 Create a Supabase Project

1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details:
   - Name: `timetable-management` (or any name you prefer)
   - Database Password: (save this securely)
   - Region: Choose closest to you
5. Wait for the project to be created (takes 1-2 minutes)

### 2.2 Run the Database Schema

1. In your Supabase project, go to the SQL Editor
2. Click "New Query"
3. Open the file `timetable/backend/database/schema.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click "Run" or press Ctrl+Enter
7. You should see "Success. No rows returned" - this is expected

### 2.3 Get Your Supabase Credentials

1. In your Supabase project, go to Settings → API
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **service_role key** (under "Project API keys" - use the `service_role` key, NOT the `anon` key)
   - **anon key** (also under "Project API keys" - the `anon` key)

⚠️ **Important**: Keep the `service_role` key secret! Never expose it in frontend code.

## Step 3: Configure Environment Variables

1. In the `timetable/backend` directory, create a `.env` file:

```bash
# Windows (PowerShell)
New-Item .env

# Mac/Linux
touch .env
```

2. Add the following content to `.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

3. Replace the placeholder values with your actual Supabase credentials

## Step 4: Start the Backend Server

```bash
# Development mode (auto-reload on changes)
npm run dev

# Or production mode
npm start
```

You should see:
```
🚀 Backend server running at http://localhost:5000
📊 Health check: http://localhost:5000/api/health
🔐 Environment: development
```

## Step 5: Verify the Setup

### 5.1 Test the Health Endpoint

Open your browser or use curl:

```bash
curl http://localhost:5000/api/health
```

You should get:
```json
{
  "ok": true,
  "database": "connected",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 5.2 Test Database Connection

If the health check returns `"database": "connected"`, your database is properly configured!

## Step 6: Create Your First Admin User

You can create an admin user using the API:

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

Or use a tool like Postman or Thunder Client (VS Code extension).

## Common Issues

### Issue: "Cannot find module '@supabase/supabase-js'"

**Solution**: Run `npm install` in the backend directory

### Issue: "Invalid API key" or Database connection errors

**Solution**: 
- Double-check your `.env` file has the correct Supabase credentials
- Make sure you're using the `service_role` key (not `anon` key) for `SUPABASE_SERVICE_ROLE_KEY`
- Verify your Supabase project is active

### Issue: "Table does not exist"

**Solution**: 
- Make sure you ran the SQL schema in Supabase SQL Editor
- Check that all tables were created (you can see them in Supabase → Table Editor)

### Issue: Port 5000 already in use

**Solution**: 
- Change the PORT in your `.env` file to a different port (e.g., 5001)
- Or stop the process using port 5000

## Next Steps

1. ✅ Backend is running
2. ✅ Database is connected
3. ✅ Admin user created
4. 🔄 Connect your frontend to the backend API
5. 🔄 Update frontend components to use the API endpoints

## API Documentation

See `timetable/backend/README.md` for complete API documentation.

## Security Notes

- Never commit your `.env` file to version control
- Use a strong, random `JWT_SECRET` in production
- Keep your `SUPABASE_SERVICE_ROLE_KEY` secret
- The service role key bypasses Row Level Security (RLS) - use carefully

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify your Supabase project is active
3. Ensure all environment variables are set correctly
4. Check that the database schema was applied successfully


