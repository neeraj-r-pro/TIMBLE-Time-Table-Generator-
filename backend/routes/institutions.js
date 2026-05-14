const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { verifyToken } = require('./auth');

const generateInstitutionCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching institutions:', error);
    res.status(500).json({ error: 'Failed to fetch institutions', details: error.message });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Institution not found' });
    res.json(data);
  } catch (error) {
    console.error('Error fetching institution:', error);
    res.status(500).json({ error: 'Failed to fetch institution', details: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    let code;
    let attempts = 0;
    while (attempts < 10) {
      code = generateInstitutionCode();
      const { data: existing } = await supabase.from('institutions').select('id').eq('code', code).single();
      if (!existing) break;
      attempts++;
    }
    if (attempts >= 10) return res.status(500).json({ error: 'Failed to generate unique code' });

    const { data, error } = await supabase
      .from('institutions')
      .insert({ code, name: name.trim(), description: description || null })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating institution:', error);
    res.status(500).json({ error: 'Failed to create institution', details: error.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;

    const { data, error } = await supabase
      .from('institutions')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Institution not found' });
    res.json(data);
  } catch (error) {
    console.error('Error updating institution:', error);
    res.status(500).json({ error: 'Failed to update institution', details: error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase.from('institutions').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Institution deleted successfully' });
  } catch (error) {
    console.error('Error deleting institution:', error);
    res.status(500).json({ error: 'Failed to delete institution', details: error.message });
  }
});

module.exports = router;
