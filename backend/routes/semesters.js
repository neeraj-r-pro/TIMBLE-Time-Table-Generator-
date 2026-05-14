const express = require('express');
const router = express.Router();
const supabase = require('../db');
const { verifyToken } = require('./auth');

// GET /api/semesters?institutionId=...
router.get('/', verifyToken, async (req, res) => {
    try {
        const { institutionId } = req.query;
        let query = supabase.from('semesters').select('*').order('name');
        if (institutionId) query = query.eq('institution_id', institutionId);
        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (error) {
        console.error('Error fetching semesters:', error);
        res.status(500).json({ error: 'Failed to fetch semesters', details: error.message });
    }
});

// GET /api/semesters/:id
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('semesters')
            .select('*')
            .eq('id', req.params.id)
            .single();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Semester not found' });
        res.json(data);
    } catch (error) {
        console.error('Error fetching semester:', error);
        res.status(500).json({ error: 'Failed to fetch semester', details: error.message });
    }
});

// POST /api/semesters
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, institutionId } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
        if (!institutionId) return res.status(400).json({ error: 'Institution ID is required' });

        const { data, error } = await supabase
            .from('semesters')
            .insert({ name: name.trim(), institution_id: institutionId })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating semester:', error);
        res.status(500).json({ error: 'Failed to create semester', details: error.message });
    }
});

// PUT /api/semesters/:id
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { name } = req.body;
        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();

        const { data, error } = await supabase
            .from('semesters')
            .update(updateData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Semester not found' });
        res.json(data);
    } catch (error) {
        console.error('Error updating semester:', error);
        res.status(500).json({ error: 'Failed to update semester', details: error.message });
    }
});

// DELETE /api/semesters/:id
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { error } = await supabase.from('semesters').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Semester deleted successfully' });
    } catch (error) {
        console.error('Error deleting semester:', error);
        res.status(500).json({ error: 'Failed to delete semester', details: error.message });
    }
});

// GET /api/semesters/:id/batches — get batches linked to a semester
router.get('/:id/batches', verifyToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('semester_batches')
            .select('batch_id, batches(*)')
            .eq('semester_id', req.params.id);

        if (error) throw error;
        const batches = (data || []).map(row => row.batches).filter(Boolean);
        res.json(batches);
    } catch (error) {
        console.error('Error fetching semester batches:', error);
        res.status(500).json({ error: 'Failed to fetch semester batches', details: error.message });
    }
});

// POST /api/semesters/:id/batches — link batch IDs to semester
router.post('/:id/batches', verifyToken, async (req, res) => {
    try {
        const { batchIds } = req.body;
        if (!Array.isArray(batchIds) || batchIds.length === 0) {
            return res.status(400).json({ error: 'batchIds array is required' });
        }

        const rows = batchIds.map(batchId => ({
            semester_id: req.params.id,
            batch_id: batchId,
        }));

        // Upsert to avoid duplicates
        const { data, error } = await supabase
            .from('semester_batches')
            .upsert(rows, { onConflict: 'semester_id,batch_id' })
            .select();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Error linking batches to semester:', error);
        res.status(500).json({ error: 'Failed to link batches', details: error.message });
    }
});

// DELETE /api/semesters/:id/batches/:batchId — unlink a batch
router.delete('/:id/batches/:batchId', verifyToken, async (req, res) => {
    try {
        const { error } = await supabase
            .from('semester_batches')
            .delete()
            .eq('semester_id', req.params.id)
            .eq('batch_id', req.params.batchId);

        if (error) throw error;
        res.json({ message: 'Batch unlinked from semester' });
    } catch (error) {
        console.error('Error unlinking batch:', error);
        res.status(500).json({ error: 'Failed to unlink batch', details: error.message });
    }
});

module.exports = router;
