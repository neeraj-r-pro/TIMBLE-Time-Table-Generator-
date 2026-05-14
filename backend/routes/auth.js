const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../db');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['admin', 'faculty', 'student'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email);

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine
      throw checkError;
    }

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name,
        role
      })
      .select()
      .single();

    if (userError) throw userError;

    // Create role-specific record
    if (role === 'faculty') {
      await supabase
        .from('faculties')
        .insert({
          user_id: user.id,
          name,
          email
        });
    } else if (role === 'student') {
      await supabase
        .from('students')
        .insert({
          user_id: user.id,
          name,
          email
        });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user', details: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role, timetableCode } = req.body;

    // Student login with timetable code
    if (role === 'student' && timetableCode) {
      // Validate timetable code
      const { data: timetable, error: timetableError } = await supabase
        .from('timetables')
        .select('id, code, name')
        .eq('code', timetableCode.toUpperCase())
        .single();

      if (timetableError || !timetable) {
        return res.status(401).json({ error: 'Invalid timetable code' });
      }

      // For student login with code, we create a minimal session
      // In a real system, you might want to link students to timetables via batch_id
      const token = jwt.sign(
        { 
          role: 'student', 
          timetableId: timetable.id,
          timetableCode: timetable.code 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      return res.json({
        message: 'Login successful',
        token,
        user: {
          role: 'student',
          timetableId: timetable.id,
          timetableCode: timetable.code,
          timetableName: timetable.name
        }
      });
    }

    // Regular login with email and password
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);

    if (userError) {
      console.error('Database error:', userError);
      return res.status(500).json({ error: 'Database error', details: userError.message });
    }

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check role if provided (map 'creator' to 'admin' for comparison)
    if (role) {
      const normalizedRole = role === 'creator' ? 'admin' : role;
      if (user.role !== normalizedRole) {
        return res.status(403).json({ error: 'Invalid role for this account' });
      }
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Get role-specific data
    let roleData = {};
    if (user.role === 'faculty') {
      const { data: faculty } = await supabase
        .from('faculties')
        .select('*')
        .eq('user_id', user.id)
        .single();
      roleData = faculty;
    } else if (user.role === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .single();
      roleData = student;
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        ...roleData
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message });
  }
});

// Verify token (middleware helper)
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { router, verifyToken };


