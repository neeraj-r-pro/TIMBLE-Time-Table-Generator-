const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { verifyToken } = require('./auth');

// Get all schedules (optionally filtered by day)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { dayOfWeek, institutionId, timetableId } = req.query;

    let query = supabase
      .from('schedules')
      .select('*')
      .order('day_of_week, start_time');

    if (dayOfWeek) {
      query = query.eq('day_of_week', dayOfWeek);
    }
    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }
    if (timetableId) {
      query = query.eq('timetable_id', timetableId);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules', details: error.message });
  }
});

// Create or update schedules (bulk operation)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { schedules } = req.body; // Array of schedule objects

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ error: 'Schedules array is required' });
    }

    // Delete existing schedules first (optional - you might want to keep them)
    // await supabase.from('schedules').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { data, error } = await supabase
      .from('schedules')
      .insert(
        schedules.map(s => ({
          day_of_week: s.dayOfWeek || s.day_of_week,
          period_name: s.periodName || s.period_name,
          start_time: s.startTime || s.start_time,
          end_time: s.endTime || s.end_time,
          type: s.type,
          institution_id: s.institutionId || s.institution_id || null,
          timetable_id: s.timetableId || s.timetable_id || null
        }))
      )
      .select();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating schedules:', error);
    res.status(500).json({ error: 'Failed to create schedules', details: error.message });
  }
});

// Delete all schedules for a day
router.delete('/day/:dayOfWeek', verifyToken, async (req, res) => {
  try {
    const { institutionId, timetableId } = req.query;
    let query = supabase.from('schedules').delete();

    if (req.params.dayOfWeek !== 'all') {
      query = query.eq('day_of_week', req.params.dayOfWeek);
    }
    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }
    if (timetableId) {
      query = query.eq('timetable_id', timetableId);
    }

    const { error } = await query;

    if (error) throw error;

    res.json({ message: 'Schedules deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedules:', error);
    res.status(500).json({ error: 'Failed to delete schedules', details: error.message });
  }
});

module.exports = router;


