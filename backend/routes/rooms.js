const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { verifyToken } = require('./auth');

// Get all rooms (optionally filtered by institutionId)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { institutionId } = req.query;
    let query = supabase.from('rooms').select('*').order('name');
    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }
    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms', details: error.message });
  }
});

// Get single room
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room', details: error.message });
  }
});

// Create room
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, code, type, building, floor, capacity, equipment, institutionId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!institutionId) {
      return res.status(400).json({ error: 'Institution is required' });
    }

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        name,
        code: code || null,
        type: type || 'Classroom',
        building: building || null,
        floor: floor || 1,
        capacity: capacity || null,
        equipment: equipment || [],
        institution_id: institutionId
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room', details: error.message });
  }
});

// Update room
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, type, building, floor, capacity, equipment } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (building) updateData.building = building;
    if (floor !== undefined) updateData.floor = floor;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (equipment !== undefined) updateData.equipment = equipment;

    const { data, error } = await supabase
      .from('rooms')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Failed to update room', details: error.message });
  }
});

// Delete room
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete room', details: error.message });
  }
});

module.exports = router;


