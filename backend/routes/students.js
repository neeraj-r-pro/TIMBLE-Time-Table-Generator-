const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { verifyToken } = require('./auth');

// Get all students
router.get('/', verifyToken, async (req, res) => {
  try {
    const { class: classFilter } = req.query;

    let query = supabase
      .from('students')
      .select('*')
      .order('roll_no');

    if (classFilter && classFilter !== 'all') {
      query = query.eq('class', classFilter);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students', details: error.message });
  }
});

// Get single student
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Failed to fetch student', details: error.message });
  }
});

// Create student
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, rollNo, email, class: studentClass, semester, section, batchId } = req.body;

    if (!name || !rollNo || !email || !studentClass || !semester) {
      return res.status(400).json({ error: 'Name, roll number, email, class, and semester are required' });
    }

    const { data, error } = await supabase
      .from('students')
      .insert({
        name,
        roll_no: rollNo,
        email,
        class: studentClass,
        semester,
        section,
        batch_id: batchId
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Failed to create student', details: error.message });
  }
});

// Update student
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, rollNo, email, class: studentClass, semester, section, batchId } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (rollNo) updateData.roll_no = rollNo;
    if (email) updateData.email = email;
    if (studentClass) updateData.class = studentClass;
    if (semester !== undefined) updateData.semester = semester;
    if (section !== undefined) updateData.section = section;
    if (batchId !== undefined) updateData.batch_id = batchId;

    const { data, error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Failed to update student', details: error.message });
  }
});

// Delete student
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Failed to delete student', details: error.message });
  }
});

module.exports = router;


