const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { verifyToken } = require('./auth');

// Get all subjects (optionally filtered by batch or institutionId)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { batchId, institutionId } = req.query;

    let query = supabase
      .from('subjects')
      .select('*, batch:batches(name)')
      .order('code');

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }
    if (institutionId) {
      const { data: batches } = await supabase
        .from('batches')
        .select('id')
        .eq('institution_id', institutionId);
      const batchIds = (batches || []).map((b) => b.id);
      if (batchIds.length === 0) {
        return res.json([]);
      }
      query = query.in('batch_id', batchIds);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Map batch.name to batch_name for easier frontend use
    const mappedData = (data || []).map(s => ({
      ...s,
      batch_name: s.batch ? s.batch.name : null
    }));

    res.json(mappedData);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects', details: error.message });
  }
});

// Get single subject
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ error: 'Failed to fetch subject', details: error.message });
  }
});

// Create subject
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      batchId,
      name,
      code,
      facultyId,
      periodsPerWeek,
      consecutivePeriods,
      type,
      requiresLab,
      maxStudentsPerGroup,
      frequencyConfig
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        error: 'Name and code are required'
      });
    }

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        batch_id: batchId || null,
        name,
        code,
        faculty_id: facultyId || null,
        periods_per_week: periodsPerWeek || 0,
        consecutive_periods: consecutivePeriods || 1,
        type: type || 'theory',
        requires_lab: requiresLab || false,
        max_students_per_group: maxStudentsPerGroup || null,
        frequency_config: frequencyConfig || null
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Failed to create subject', details: error.message });
  }
});

// Update subject
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const {
      name,
      code,
      facultyId,
      periodsPerWeek,
      consecutivePeriods,
      type,
      requiresLab,
      maxStudentsPerGroup,
      frequencyConfig
    } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (code) updateData.code = code;
    if (facultyId) updateData.faculty_id = facultyId;
    if (periodsPerWeek !== undefined) updateData.periods_per_week = periodsPerWeek;
    if (consecutivePeriods !== undefined) updateData.consecutive_periods = consecutivePeriods;
    if (type) updateData.type = type;
    if (requiresLab !== undefined) updateData.requires_lab = requiresLab;
    if (maxStudentsPerGroup !== undefined) updateData.max_students_per_group = maxStudentsPerGroup;
    if (frequencyConfig !== undefined) updateData.frequency_config = frequencyConfig;

    const { data, error } = await supabase
      .from('subjects')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ error: 'Failed to update subject', details: error.message });
  }
});

// Bulk delete subjects
router.delete('/bulk', verifyToken, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Subject IDs array is required' });
    }

    const { error } = await supabase
      .from('subjects')
      .delete()
      .in('id', ids);

    if (error) throw error;

    res.json({ message: 'Subjects deleted successfully' });
  } catch (error) {
    console.error('Error bulk deleting subjects:', error);
    res.status(500).json({ error: 'Failed to delete subjects', details: error.message });
  }
});

// Delete single subject
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Failed to delete subject', details: error.message });
  }
});

module.exports = router;


