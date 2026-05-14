const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { verifyToken } = require('./auth');

// Get all faculties (optionally filtered by institutionId)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { institutionId } = req.query;

    // If no institution filter is provided, return all faculties
    if (!institutionId) {
      const { data, error } = await supabase.from('faculties').select('*').order('name');
      if (error) throw error;
      return res.json(data);
    }

    // When institutionId is provided, use the faculty_institutions join table
    const { data: links, error: linksError } = await supabase
      .from('faculty_institutions')
      .select('faculty_id')
      .eq('institution_id', institutionId);

    if (linksError) throw linksError;

    const facultyIds = (links || []).map((l) => l.faculty_id);
    if (facultyIds.length === 0) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('faculties')
      .select('*')
      .in('id', facultyIds)
      .order('name');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ error: 'Failed to fetch faculties', details: error.message });
  }
});

// Get institutions linked to the current faculty user
router.get('/my-institutions', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the base faculty record for this user
    const { data: faculty, error: facultyError } = await supabase
      .from('faculties')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (facultyError || !faculty) {
      return res.json([]);
    }

    // Find institution links for this faculty
    const { data: links, error: linksError } = await supabase
      .from('faculty_institutions')
      .select('institution_id')
      .eq('faculty_id', faculty.id);

    if (linksError) throw linksError;

    const institutionIds = (links || []).map((l) => l.institution_id);
    if (institutionIds.length === 0) {
      return res.json([]);
    }

    const { data: institutions, error: instError } = await supabase
      .from('institutions')
      .select('*')
      .in('id', institutionIds)
      .order('name');

    if (instError) throw instError;

    res.json(institutions || []);
  } catch (error) {
    console.error('Error fetching faculty institutions:', error);
    res
      .status(500)
      .json({ error: 'Failed to fetch faculty institutions', details: error.message });
  }
});

// Link the current faculty user to an institution using its code
router.post('/link-institution', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { code } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Institution code is required' });
    }

    // Get the user to ensure they are a faculty user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', userId)
      .single();

    if (userError) throw userError;
    if (!user || user.role !== 'faculty') {
      return res
        .status(403)
        .json({ error: 'Only faculty users can link institutions using a code' });
    }

    // Look up institution by code
    const normalizedCode = code.trim().toUpperCase();
    const { data: institution, error: instError } = await supabase
      .from('institutions')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (instError || !institution) {
      return res.status(404).json({ error: 'Invalid institution code' });
    }

    // Find or create the base faculty record for this user
    let { data: baseFaculty, error: baseFacultyError } = await supabase
      .from('faculties')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (baseFacultyError && baseFacultyError.code !== 'PGRST116') {
      throw baseFacultyError;
    }

    if (!baseFaculty) {
      const insertPayload = {
        user_id: user.id,
        name: user.name,
        email: user.email,
        department: 'General',
        designation: 'Faculty',
        max_hours_per_week: 20,
      };

      const { data: createdFaculty, error: createError } = await supabase
        .from('faculties')
        .insert(insertPayload)
        .select()
        .single();

      if (createError) throw createError;
      baseFaculty = createdFaculty;
    }

    // Link this faculty to the institution in the join table
    const { data: link, error: linkError } = await supabase
      .from('faculty_institutions')
      .insert({
        faculty_id: baseFaculty.id,
        institution_id: institution.id,
      })
      .select()
      .single();

    if (linkError) {
      // If the link already exists, just return success
      if (linkError.code === '23505') {
        return res.status(200).json({
          message: 'Already linked to this institution',
          institution,
        });
      }
      throw linkError;
    }

    res.status(201).json({
      message: 'Institution linked successfully',
      institution,
      link,
    });
  } catch (error) {
    console.error('Error linking institution to faculty:', error);
    res.status(500).json({
      error: 'Failed to link institution',
      details: error.message,
    });
  }
});

// Unlink the current faculty user from an institution
router.delete('/unlink-institution/:institutionId', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { institutionId } = req.params;

    // Find the faculty record for this user
    const { data: faculty, error: facultyError } = await supabase
      .from('faculties')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (facultyError || !faculty) {
      return res.status(404).json({ error: 'Faculty profile not found' });
    }

    // Remove the link from the join table
    const { error: deleteError } = await supabase
      .from('faculty_institutions')
      .delete()
      .eq('faculty_id', faculty.id)
      .eq('institution_id', institutionId);

    if (deleteError) throw deleteError;

    res.json({ message: 'Institution unlinked successfully' });
  } catch (error) {
    console.error('Error unlinking institution:', error);
    res.status(500).json({
      error: 'Failed to unlink institution',
      details: error.message,
    });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('faculties')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching faculty:', error);
    res.status(500).json({ error: 'Failed to fetch faculty', details: error.message });
  }
});

// Create faculty (creator-managed)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, code, email, phone, department, designation, maxHoursPerWeek, institutionId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!institutionId) {
      return res.status(400).json({ error: 'Institution is required' });
    }

    // Auto-generate a unique placeholder email if none provided (email is NOT NULL UNIQUE in DB)
    const resolvedEmail = email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.${Date.now()}@faculty.local`;

    const insertData = {
      name,
      code: code || null,
      email: resolvedEmail,
      phone: phone || null,
      department: department || 'General',
      designation: designation || 'Faculty',
      max_hours_per_week: maxHoursPerWeek || 20,
    };

    const { data: faculty, error } = await supabase
      .from('faculties')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    // Link this faculty to the institution in faculty_institutions
    await supabase
      .from('faculty_institutions')
      .insert({
        faculty_id: faculty.id,
        institution_id: institutionId,
      });

    res.status(201).json(faculty);
  } catch (error) {
    console.error('Error creating faculty:', error);
    res.status(500).json({ error: 'Failed to create faculty', details: error.message });
  }
});

// Update faculty
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, email, phone, department, designation, maxHoursPerWeek } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (department) updateData.department = department;
    if (designation) updateData.designation = designation;
    if (maxHoursPerWeek !== undefined) updateData.max_hours_per_week = maxHoursPerWeek;

    const { data, error } = await supabase
      .from('faculties')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating faculty:', error);
    res.status(500).json({ error: 'Failed to update faculty', details: error.message });
  }
});

// Delete faculty
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('faculties')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Faculty deleted successfully' });
  } catch (error) {
    console.error('Error deleting faculty:', error);
    res.status(500).json({ error: 'Failed to delete faculty', details: error.message });
  }
});

module.exports = router;


