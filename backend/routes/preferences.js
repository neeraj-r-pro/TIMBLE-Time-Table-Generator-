const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { verifyToken } = require('./auth');

// Get preferences for a faculty (optionally for a specific timetable)
router.get('/faculty/:facultyId', verifyToken, async (req, res) => {
  try {
    const { timetableId } = req.query;

    let query = supabase
      .from('faculty_preferences')
      .select('*')
      .eq('faculty_id', req.params.facultyId);

    if (timetableId) {
      query = query.eq('timetable_id', timetableId);
    } else {
      query = query.is('timetable_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.json(null); // Return null if no preferences exist
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching faculty preferences:', error);
    res.status(500).json({ error: 'Failed to fetch faculty preferences', details: error.message });
  }
});

// Create or update faculty preferences (per timetable)
router.post('/faculty/:facultyId', verifyToken, async (req, res) => {
  try {
    const {
      preferredDays,
      preferredTimes,
      unavailableDays,
      unavailableTimes,
      notes,
      timeMatrix,
      preferredSubjects,
      subjectSlots,
      timetableId
    } = req.body;

    // Check if preferences already exist for this faculty + timetable
    let existingQuery = supabase
      .from('faculty_preferences')
      .select('id')
      .eq('faculty_id', req.params.facultyId);

    if (timetableId) {
      existingQuery = existingQuery.eq('timetable_id', timetableId);
    } else {
      existingQuery = existingQuery.is('timetable_id', null);
    }

    const { data: existing, error: findError } = await existingQuery.maybeSingle();
    if (findError) throw findError;

    // Build update/insert object
    const preferenceData = {};
    if (preferredDays !== undefined) preferenceData.preferred_days = preferredDays;
    if (preferredTimes !== undefined) preferenceData.preferred_times = preferredTimes;
    if (unavailableDays !== undefined) preferenceData.unavailable_days = unavailableDays;
    if (unavailableTimes !== undefined) preferenceData.unavailable_times = unavailableTimes;
    if (notes !== undefined) preferenceData.notes = notes;
    if (timeMatrix !== undefined) preferenceData.time_matrix = timeMatrix;
    if (preferredSubjects !== undefined) preferenceData.preferred_subjects = preferredSubjects;
    if (subjectSlots !== undefined) preferenceData.subject_slots = subjectSlots;
    if (timetableId !== undefined) preferenceData.timetable_id = timetableId || null;

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('faculty_preferences')
        .update(preferenceData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('faculty_preferences')
        .insert({
          faculty_id: req.params.facultyId,
          timetable_id: timetableId || null,
          preferred_days: preferredDays || [],
          preferred_times: preferredTimes || [],
          unavailable_days: unavailableDays || [],
          unavailable_times: unavailableTimes || [],
          notes,
          time_matrix: timeMatrix || {},
          preferred_subjects: preferredSubjects || [],
          subject_slots: subjectSlots || {}
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    res.status(existing ? 200 : 201).json(result);
  } catch (error) {
    console.error('Error saving faculty preferences:', error);
    res.status(500).json({
      error: 'Failed to save faculty preferences',
      message: error.message,
      details: error.details || error.hint || 'No additional details'
    });
  }
});

// Get all preferences for a timetable (admin view)
router.get('/timetable/:timetableId', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('faculty_preferences')
      .select('*, faculties(id, name, email, department)')
      .eq('timetable_id', req.params.timetableId);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching timetable preferences:', error);
    res.status(500).json({ error: 'Failed to fetch timetable preferences', details: error.message });
  }
});

module.exports = router;
