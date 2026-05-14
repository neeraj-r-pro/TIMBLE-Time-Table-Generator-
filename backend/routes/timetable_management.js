const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { verifyToken } = require('./auth');

const { generateTimetableCode } = require('../utils/codeGenerator');

// Get all timetables (optionally filtered by institutionId)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { institutionId } = req.query;

    let query = supabase.from('timetables').select('*').order('created_at', { ascending: false });
    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching timetables:', error);
    res.status(500).json({ error: 'Failed to fetch timetables', details: error.message });
  }
});

// Get timetable by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('timetables')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching timetable:', error);
    res.status(500).json({ error: 'Failed to fetch timetable', details: error.message });
  }
});

// Get full timetable data by code (for faculty preferences - must be before /code/:code)
router.get('/code/:code/full', async (req, res) => {
  try {
    const { data: timetable, error: ttError } = await supabase
      .from('timetables')
      .select('*')
      .eq('code', req.params.code.toUpperCase().trim())
      .single();

    if (ttError || !timetable) {
      return res.status(404).json({ error: 'Invalid timetable code' });
    }

    const timetableId = timetable.id;
    const config = timetable.config || {};

    const { data: batches } = await supabase
      .from('batches')
      .select('*')
      .eq('institution_id', timetable.institution_id)
      .order('code');

    // Load subjects from the institution (all subjects visible to faculty)
    let subjects = [];
    if (timetable.institution_id) {
      const { data: subs } = await supabase
        .from('subjects')
        .select('*, batch:batches(name)')
        .eq('institution_id', timetable.institution_id)
        .order('name');
      subjects = (subs || []).map(s => ({
        ...s,
        batch_name: s.batch ? s.batch.name : null
      }));
    }

    // Fallback: also try loading subjects by batch_id if institution query returned nothing
    if (subjects.length === 0) {
      const batchIds = (batches || []).map(b => b.id);
      if (batchIds.length > 0) {
        const { data: subs } = await supabase
          .from('subjects')
          .select('*, batch:batches(name)')
          .in('batch_id', batchIds)
          .order('name');
        subjects = (subs || []).map(s => ({
          ...s,
          batch_name: s.batch ? s.batch.name : null
        }));
      }
    }

    res.json({
      ...timetable,
      batches: batches || [],
      subjects,
      schedule: config.schedule || {},
      scheduleList: config.scheduleList || null,
      breakSettings: config.breakSettings || {}
    });
  } catch (error) {
    console.error('Error fetching timetable by code:', error);
    res.status(500).json({ error: 'Failed to fetch timetable', details: error.message });
  }
});

// Get timetable by code (for student login and faculty selection)
router.get('/code/:code', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('timetables')
      .select('*')
      .eq('code', req.params.code.toUpperCase().trim())
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Invalid timetable code' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching timetable by code:', error);
    res.status(500).json({ error: 'Failed to fetch timetable', details: error.message });
  }
});

// Create new timetable
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, academicYear, semester, description, institutionId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Timetable name is required' });
    }

    // Generate unique code
    let code;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      code = generateTimetableCode();
      const { data: existing } = await supabase
        .from('timetables')
        .select('id')
        .eq('code', code)
        .single();

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate unique code. Please try again.' });
    }

    // Get user ID from token
    const userId = req.user?.userId;

    const insertData = {
      code,
      name,
      academic_year: academicYear,
      semester,
      description,
      created_by: userId
    };
    if (institutionId) insertData.institution_id = institutionId;

    const { data, error } = await supabase
      .from('timetables')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating timetable:', error);
    res.status(500).json({ error: 'Failed to create timetable', details: error.message });
  }
});

// Update timetable
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, academicYear, semester, description, config, institutionId, workflowState } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (academicYear !== undefined) updateData.academic_year = academicYear;
    if (semester !== undefined) updateData.semester = semester;
    if (description !== undefined) updateData.description = description;
    if (institutionId !== undefined) updateData.institution_id = institutionId || null;
    if (config !== undefined) {
      const { data: existing } = await supabase.from('timetables').select('config').eq('id', req.params.id).single();
      updateData.config = { ...(existing?.config || {}), ...config };
    }
    if (workflowState !== undefined) updateData.workflow_state = workflowState;

    // Nothing to update
    if (Object.keys(updateData).length === 0) {
      const { data: current, error: fetchErr } = await supabase
        .from('timetables')
        .select('*')
        .eq('id', req.params.id)
        .single();
      if (fetchErr) throw fetchErr;
      return res.json(current);
    }

    const { data, error } = await supabase
      .from('timetables')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', { code: error.code, message: error.message, details: error.details, hint: error.hint });
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Timetable not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating timetable:', error);
    res.status(500).json({ error: 'Failed to update timetable', details: error.message });
  }
});

// Delete timetable (cascades to timetable_entries)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('timetables')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    console.error('Error deleting timetable:', error);
    res.status(500).json({ error: 'Failed to delete timetable', details: error.message });
  }
});

module.exports = router;



