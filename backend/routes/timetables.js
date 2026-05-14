const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { verifyToken } = require('./auth');

// Get timetable entries (optionally filtered by batch, faculty, day, or timetable)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { batchId, facultyId, dayOfWeek, timetableId } = req.query;

    let query = supabase
      .from('timetable_entries')
      .select(`
        *,
        batch:batches(*),
        subject:subjects(*),
        faculty:faculties(*),
        room:rooms(*)
      `)
      .order('day_of_week, start_time');

    if (timetableId) {
      query = query.eq('timetable_id', timetableId);
    }
    if (batchId) {
      query = query.eq('batch_id', batchId);
    }
    if (facultyId) {
      query = query.eq('faculty_id', facultyId);
    }
    if (dayOfWeek) {
      query = query.eq('day_of_week', dayOfWeek);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching timetable entries:', error);
    res.status(500).json({ error: 'Failed to fetch timetable entries', details: error.message });
  }
});

// Get timetable for a specific batch
router.get('/batch/:batchId', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('timetable_entries')
      .select(`
        *,
        subject:subjects(*),
        faculty:faculties(*),
        room:rooms(*)
      `)
      .eq('batch_id', req.params.batchId)
      .order('day_of_week, start_time');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching batch timetable:', error);
    res.status(500).json({ error: 'Failed to fetch batch timetable', details: error.message });
  }
});

// Get timetable for a specific faculty
router.get('/faculty/:facultyId', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('timetable_entries')
      .select(`
        *,
        batch:batches(*),
        subject:subjects(*),
        room:rooms(*)
      `)
      .eq('faculty_id', req.params.facultyId)
      .order('day_of_week, start_time');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching faculty timetable:', error);
    res.status(500).json({ error: 'Failed to fetch faculty timetable', details: error.message });
  }
});

// Create timetable entry
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      batchId,
      subjectId,
      facultyId,
      roomId,
      dayOfWeek,
      periodNumber,
      startTime,
      endTime,
      academicYear,
      semester
    } = req.body;

    if (!batchId || !subjectId || !facultyId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({
        error: 'Batch ID, subject ID, faculty ID, day, start time, and end time are required'
      });
    }

    const { data, error } = await supabase
      .from('timetable_entries')
      .insert({
        batch_id: batchId,
        subject_id: subjectId,
        faculty_id: facultyId,
        room_id: roomId,
        day_of_week: dayOfWeek,
        period_number: periodNumber || 1,
        start_time: startTime,
        end_time: endTime,
        academic_year: academicYear,
        semester
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating timetable entry:', error);
    res.status(500).json({ error: 'Failed to create timetable entry', details: error.message });
  }
});

// Bulk create timetable entries
router.post('/bulk', verifyToken, async (req, res) => {
  try {
    const { entries } = req.body; // Array of timetable entry objects

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Entries array is required' });
    }

    const { data, error } = await supabase
      .from('timetable_entries')
      .insert(
        entries.map(e => ({
          timetable_id: e.timetableId || e.timetable_id,
          batch_id: e.batchId || e.batch_id,
          subject_id: e.subjectId || e.subject_id,
          faculty_id: e.facultyId || e.faculty_id,
          room_id: e.roomId || e.room_id,
          day_of_week: e.dayOfWeek || e.day_of_week,
          period_number: e.periodNumber || e.period_number || 1,
          start_time: e.startTime || e.start_time,
          end_time: e.endTime || e.end_time,
          academic_year: e.academicYear || e.academic_year,
          semester: e.semester
        }))
      )
      .select();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating timetable entries:', error);
    res.status(500).json({ error: 'Failed to create timetable entries', details: error.message });
  }
});

// Update timetable entry
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const {
      batchId,
      subjectId,
      facultyId,
      roomId,
      dayOfWeek,
      periodNumber,
      startTime,
      endTime
    } = req.body;

    const updateData = {};
    if (batchId) updateData.batch_id = batchId;
    if (subjectId) updateData.subject_id = subjectId;
    if (facultyId) updateData.faculty_id = facultyId;
    if (roomId !== undefined) updateData.room_id = roomId;
    if (dayOfWeek) updateData.day_of_week = dayOfWeek;
    if (periodNumber !== undefined) updateData.period_number = periodNumber;
    if (startTime) updateData.start_time = startTime;
    if (endTime) updateData.end_time = endTime;

    const { data, error } = await supabase
      .from('timetable_entries')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Timetable entry not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating timetable entry:', error);
    res.status(500).json({ error: 'Failed to update timetable entry', details: error.message });
  }
});

// Delete timetable entry
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('timetable_entries')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Timetable entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting timetable entry:', error);
    res.status(500).json({ error: 'Failed to delete timetable entry', details: error.message });
  }
});

// Delete all timetable entries for a specific timetable
router.delete('/timetable/:timetableId', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('timetable_entries')
      .delete()
      .eq('timetable_id', req.params.timetableId);

    if (error) throw error;

    res.json({ message: 'Timetable entries deleted successfully' });
  } catch (error) {
    console.error('Error deleting timetable entries:', error);
    res.status(500).json({ error: 'Failed to delete timetable entries', details: error.message });
  }
});

module.exports = router;


