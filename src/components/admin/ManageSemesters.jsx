import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Loader2, Calendar, X, Check } from 'lucide-react';
import './ManageSemesters.css';
import { semestersAPI, batchesAPI, institutionsAPI } from '../../services/api';

export function ManageSemesters() {
    const [institutions, setInstitutions] = useState([]);
    const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
    const [semesters, setSemesters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formName, setFormName] = useState('');
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    // Batch linking state
    const [institutionBatches, setInstitutionBatches] = useState([]);
    const [semesterBatches, setSemesterBatches] = useState({}); // { semesterId: [batch, ...] }
    const [expandedSemester, setExpandedSemester] = useState(null);
    const [linkingBatch, setLinkingBatch] = useState(false);

    useEffect(() => {
        institutionsAPI.getAll().then(data => {
            setInstitutions(data || []);
            const stored = localStorage.getItem('admin_selected_institution_id');
            if (stored && data?.some(i => i.id === stored)) {
                setSelectedInstitutionId(stored);
            } else if (data?.length > 0) {
                setSelectedInstitutionId(data[0].id);
            }
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedInstitutionId) {
            fetchSemesters();
            batchesAPI.getAll(null, selectedInstitutionId).then(b => setInstitutionBatches(b || [])).catch(console.error);
        }
    }, [selectedInstitutionId]);

    const fetchSemesters = async () => {
        setLoading(true);
        try {
            const data = await semestersAPI.getAll(selectedInstitutionId);
            setSemesters(data || []);
            // Load batches for each semester
            const batchMap = {};
            for (const sem of (data || [])) {
                try {
                    const batches = await semestersAPI.getBatches(sem.id);
                    batchMap[sem.id] = batches || [];
                } catch { batchMap[sem.id] = []; }
            }
            setSemesterBatches(batchMap);
        } catch (err) {
            console.error('Error fetching semesters:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setShowForm(true);
        setEditingId(null);
        setFormName('');
    };

    const handleEdit = (sem) => {
        setShowForm(true);
        setEditingId(sem.id);
        setFormName(sem.name);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this semester? All batch links will be removed.')) return;
        try {
            await semestersAPI.delete(id);
            fetchSemesters();
        } catch (err) {
            alert('Failed to delete semester: ' + err.message);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formName.trim()) return;
        setSaving(true);
        try {
            if (editingId) {
                await semestersAPI.update(editingId, { name: formName.trim() });
            } else {
                await semestersAPI.create({ name: formName.trim(), institutionId: selectedInstitutionId });
            }
            setShowForm(false);
            setEditingId(null);
            setFormName('');
            fetchSemesters();
        } catch (err) {
            alert('Failed to save semester: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLinkBatch = async (semesterId, batchId) => {
        setLinkingBatch(true);
        try {
            await semestersAPI.linkBatches(semesterId, [batchId]);
            const batches = await semestersAPI.getBatches(semesterId);
            setSemesterBatches(prev => ({ ...prev, [semesterId]: batches || [] }));
        } catch (err) {
            alert('Failed to link batch: ' + err.message);
        } finally {
            setLinkingBatch(false);
        }
    };

    const handleUnlinkBatch = async (semesterId, batchId) => {
        try {
            await semestersAPI.unlinkBatch(semesterId, batchId);
            setSemesterBatches(prev => ({
                ...prev,
                [semesterId]: (prev[semesterId] || []).filter(b => b.id !== batchId)
            }));
        } catch (err) {
            alert('Failed to unlink batch: ' + err.message);
        }
    };

    const filtered = semesters.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase())
    );

    const getAvailableBatches = (semesterId) => {
        const linked = (semesterBatches[semesterId] || []).map(b => b.id);
        return institutionBatches.filter(b => !linked.includes(b.id));
    };

    return (
        <div className="manage-semesters">
            <div className="page-header">
                <div>
                    <h1>Manage Semesters</h1>
                    <p className="page-subtitle">Group batches into semesters for timetable generation</p>
                </div>
                <button className="btn btn-primary" onClick={handleAdd} disabled={!selectedInstitutionId}>
                    <Plus className="btn-icon" /> New Semester
                </button>
            </div>

            <div className="filters-row">
                <div className="form-group" style={{ minWidth: 220 }}>
                    <select
                        className="form-input"
                        value={selectedInstitutionId}
                        onChange={e => setSelectedInstitutionId(e.target.value)}
                    >
                        <option value="">Select Institution</option>
                        {institutions.map(inst => (
                            <option key={inst.id} value={inst.id}>{inst.name} ({inst.code})</option>
                        ))}
                    </select>
                </div>
                <div className="search-box">
                    <Search className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search semesters..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="form-input"
                    />
                </div>
            </div>

            {showForm && (
                <div className="card form-card">
                    <h3>{editingId ? 'Edit Semester' : 'Create Semester'}</h3>
                    <form onSubmit={handleSave} className="semester-form">
                        <div className="form-group">
                            <label>Semester Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g., Semester 1 - 2024"
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving || !formName.trim()}>
                                {saving ? <><Loader2 className="btn-icon spinner" /> Saving...</> : <><Check className="btn-icon" /> {editingId ? 'Update' : 'Create'}</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="loading-state"><Loader2 className="spinner" style={{ width: 32, height: 32 }} /></div>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <Calendar className="empty-icon" />
                    <h3>No Semesters Yet</h3>
                    <p>Create a semester and add batches to it.</p>
                </div>
            ) : (
                <div className="semesters-grid">
                    {filtered.map(sem => {
                        const batches = semesterBatches[sem.id] || [];
                        const isExpanded = expandedSemester === sem.id;
                        const available = getAvailableBatches(sem.id);
                        return (
                            <div key={sem.id} className={`semester-card ${isExpanded ? 'expanded' : ''}`}>
                                <div className="semester-card-header">
                                    <div className="semester-info">
                                        <Calendar className="semester-icon" />
                                        <h3>{sem.name}</h3>
                                        <span className="batch-count-badge">{batches.length} batch{batches.length !== 1 ? 'es' : ''}</span>
                                    </div>
                                    <div className="semester-actions">
                                        <button className="btn-icon-only" onClick={() => setExpandedSemester(isExpanded ? null : sem.id)} title="Manage batches">
                                            {isExpanded ? <X size={16} /> : <Plus size={16} />}
                                        </button>
                                        <button className="btn-icon-only" onClick={() => handleEdit(sem)} title="Edit"><Pencil size={16} /></button>
                                        <button className="btn-icon-only btn-delete" onClick={() => handleDelete(sem.id)} title="Delete"><Trash2 size={16} /></button>
                                    </div>
                                </div>

                                {batches.length > 0 && (
                                    <div className="linked-batches">
                                        {batches.map(b => (
                                            <span key={b.id} className="batch-chip">
                                                {b.name} <span className="batch-chip-code">({b.code})</span>
                                                <button className="chip-remove" onClick={() => handleUnlinkBatch(sem.id, b.id)} title="Remove batch">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {isExpanded && (
                                    <div className="batch-linking-section">
                                        <h4>Add Batches</h4>
                                        {available.length === 0 ? (
                                            <p className="no-batches-hint">All institution batches are already linked.</p>
                                        ) : (
                                            <div className="available-batches">
                                                {available.map(b => (
                                                    <button
                                                        key={b.id}
                                                        className="btn btn-secondary btn-sm batch-add-btn"
                                                        onClick={() => handleLinkBatch(sem.id, b.id)}
                                                        disabled={linkingBatch}
                                                    >
                                                        <Plus size={14} /> {b.name} ({b.code})
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
