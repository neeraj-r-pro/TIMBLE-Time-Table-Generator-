const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { verifyToken } = require('./auth');

// Get all batches (optionally filtered by timetableId or institutionId)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { timetableId, institutionId } = req.query;

    let query = supabase
      .from('batches')
      .select('*')
      .order('code');

    if (timetableId) {
      query = query.eq('timetable_id', timetableId);
    }
    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: 'Failed to fetch batches', details: error.message });
  }
});

// Get single batch
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({ error: 'Failed to fetch batch', details: error.message });
  }
});

// Create batch
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, code, year, semester, stream, studentCount, section, timetableId, institutionId } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }
    if (!institutionId) {
      return res.status(400).json({ error: 'Institution is required' });
    }

    const insertData = {
      name,
      code,
      year: year || 1,
      semester: semester || 1,
      stream: stream || 'General',
      student_count: studentCount || null,
      section: section || null,
      institution_id: institutionId
    };
    if (timetableId) insertData.timetable_id = timetableId;

    const { data, error } = await supabase
      .from('batches')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ error: 'Failed to create batch', details: error.message });
  }
});

// Update batch
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, code, year, semester, stream, studentCount, section } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (code) updateData.code = code;
    if (year !== undefined) updateData.year = year;
    if (semester !== undefined) updateData.semester = semester;
    if (stream) updateData.stream = stream;
    if (studentCount !== undefined) updateData.student_count = studentCount;
    if (section !== undefined) updateData.section = section;

    const { data, error } = await supabase
      .from('batches')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({ error: 'Failed to update batch', details: error.message });
  }
});

// Delete batch
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({ error: 'Failed to delete batch', details: error.message });
  }
});

module.exports = router;


