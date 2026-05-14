import { useState, useEffect } from 'react';
import { Users, Loader2, Save, Pencil, X, Check, Building2, Calendar, AlertTriangle } from 'lucide-react';
import './FacultyPreferenceAdmin.css';
import { preferencesAPI, timetableManagementAPI, institutionsAPI, subjectsAPI, semestersAPI, facultiesAPI } from '../../services/api';

export function FacultyPreferenceAdmin() {
    const [institutions, setInstitutions] = useState([]);
    const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
    const [timetables, setTimetables] = useState([]);
    const [selectedTimetableId, setSelectedTimetableId] = useState('');
    const [loading, setLoading] = useState(false);
    const [preferences, setPreferences] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [editingFacultyId, setEditingFacultyId] = useState(null);
    const [editSlots, setEditSlots] = useState({});
    const [saving, setSaving] = useState(false);
    const [timetableConfig, setTimetableConfig] = useState(null);

    useEffect(() => {
        institutionsAPI.getAll().then(data => {
            setInstitutions(data || []);
            const stored = localStorage.getItem('admin_selected_institution_id');
            if (stored && data?.some(i => i.id === stored)) {
                setSelectedInstitutionId(stored);
            } else if (data?.length > 0) {
                setSelectedInstitutionId(data[0].id);
            }
        }).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedInstitutionId) {
            timetableManagementAPI.getAll({ institutionId: selectedInstitutionId })
                .then(data => {
                    setTimetables(data || []);
                    if (data?.length > 0) setSelectedTimetableId(data[0].id);
                    else setSelectedTimetableId('');
                })
                .catch(console.error);
        }
    }, [selectedInstitutionId]);

    useEffect(() => {
        if (selectedTimetableId) {
            loadPreferences();
        } else {
            setPreferences([]);
        }
    }, [selectedTimetableId]);

    const loadPreferences = async () => {
        setLoading(true);
        try {
            const [prefs, subs, facs] = await Promise.all([
                preferencesAPI.getAllForTimetable(selectedTimetableId),
                subjectsAPI.getAll(null, selectedInstitutionId),
                facultiesAPI.getAll(selectedInstitutionId)
            ]);
            setPreferences(prefs || []);
            setSubjects(subs || []);
            setFaculties(facs || []);

            // Load timetable config for slot counts
            const tt = timetables.find(t => t.id === selectedTimetableId);
            if (tt) {
                // Try to get full timetable with config
                try {
                    const full = await timetableManagementAPI.getByCodeFull(tt.code);
                    setTimetableConfig(full?.config || null);
                } catch {
                    setTimetableConfig(null);
                }
            }
        } catch (err) {
            console.error('Error loading preferences:', err);
        } finally {
            setLoading(false);
        }
    };

    const theoryCount = timetableConfig?.theorySlots || 3;
    const labCount = timetableConfig?.labSlots || 2;

    const theorySubjects = subjects.filter(s => s.type === 'theory');
    const labSubjects = subjects.filter(s => s.type === 'lab' || s.type === 'practical');

    const handleEdit = (facultyId, currentSlots) => {
        setEditingFacultyId(facultyId);
        setEditSlots(currentSlots || {});
    };

    const handleCancel = () => {
        setEditingFacultyId(null);
        setEditSlots({});
    };

    const handleSlotChange = (slotKey, value) => {
        setEditSlots(prev => ({ ...prev, [slotKey]: value }));
    };

    const handleSave = async (facultyId) => {
        setSaving(true);
        try {
            await preferencesAPI.update(facultyId, {
                subjectSlots: editSlots,
                timetableId: selectedTimetableId,
            });
            setEditingFacultyId(null);
            setEditSlots({});
            loadPreferences();
        } catch (err) {
            alert('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const getSubjectName = (subjectId) => {
        const s = subjects.find(sub => sub.id === subjectId);
        if (!s) return subjectId || '—';
        return `${s.name} (${s.code}) - ${s.batch_name || 'No Batch'}`;
    };

    const getBatchName = (subjectId) => {
        const s = subjects.find(sub => sub.id === subjectId);
        return s?.batch_name || '';
    };

    // Pre-calculate subject allocation counts to identify conflicts for highlighting
    const subjectCounts = {};
    if (faculties && faculties.length > 0) {
        faculties.forEach(faculty => {
            const pref = preferences.find(p => p.faculty_id === faculty.id) || {};
            const slots = pref.subject_slots || {};
            for (let i = 0; i < theoryCount; i++) {
                const val = slots[`theory${i + 1}`];
                if (val) subjectCounts[val] = (subjectCounts[val] || 0) + 1;
            }
            for (let i = 0; i < labCount; i++) {
                const val = slots[`lab${i + 1}`];
                if (val) subjectCounts[val] = (subjectCounts[val] || 0) + 1;
            }
        });
    }

    return (
        <div className="faculty-pref-admin">
            <div className="page-header">
                <div>
                    <h1>Faculty Preferences</h1>
                    <p className="page-subtitle">View and edit faculty subject preferences for a timetable</p>
                </div>
            </div>

            <div className="filters-row">
                <div className="form-group" style={{ minWidth: 220 }}>
                    <label>Institution</label>
                    <select className="form-input" value={selectedInstitutionId} onChange={e => setSelectedInstitutionId(e.target.value)}>
                        <option value="">Select Institution</option>
                        {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name} ({inst.code})</option>)}
                    </select>
                </div>
                <div className="form-group" style={{ minWidth: 220 }}>
                    <label>Timetable</label>
                    <select className="form-input" value={selectedTimetableId} onChange={e => setSelectedTimetableId(e.target.value)} disabled={!selectedInstitutionId}>
                        <option value="">Select Timetable</option>
                        {timetables.map(tt => <option key={tt.id} value={tt.id}>{tt.name} ({tt.code})</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading-state"><Loader2 className="spinner" style={{ width: 32, height: 32 }} /></div>
            ) : !selectedTimetableId ? (
                <div className="empty-state">
                    <Building2 className="empty-icon" />
                    <h3>Select a Timetable</h3>
                    <p>Choose an institution and timetable to view faculty preferences.</p>
                </div>
            ) : faculties.length === 0 ? (
                <div className="empty-state">
                    <Users className="empty-icon" />
                    <h3>No Faculties Found</h3>
                    <p>No faculties are registered under this institution.</p>
                </div>
            ) : (
                <div className="preferences-table-wrapper">
                    <table className="preferences-table">
                        <thead>
                            <tr>
                                <th>Faculty</th>
                                {Array.from({ length: theoryCount }, (_, i) => (
                                    <th key={`th${i}`}>Theory {i + 1}</th>
                                ))}
                                {Array.from({ length: labCount }, (_, i) => (
                                    <th key={`lb${i}`}>Lab {i + 1}</th>
                                ))}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {faculties.map(faculty => {
                                const pref = preferences.find(p => p.faculty_id === faculty.id) || { subject_slots: {} };
                                const isEditing = editingFacultyId === faculty.id;
                                const slots = isEditing ? editSlots : (pref.subject_slots || {});

                                return (
                                    <tr key={faculty.id} className={isEditing ? 'editing' : ''}>
                                        <td className="faculty-cell">
                                            <div className="faculty-name">
                                                {faculty?.name || 'Unknown'}
                                                {pref.id && <span style={{ marginLeft: '0.5rem', background: '#dcfce7', color: '#166534', padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.7rem' }}>Set</span>}
                                            </div>
                                            <div className="faculty-dept">{faculty?.department || ''}</div>
                                        </td>
                                        {Array.from({ length: theoryCount }, (_, i) => {
                                            const key = `theory${i + 1}`;
                                            const val = slots[key] || '';
                                            return (
                                                <td key={key}>
                                                    {isEditing ? (
                                                        <select className="form-input slot-select" value={val} onChange={e => handleSlotChange(key, e.target.value)}>
                                                            <option value="">—</option>
                                                            {theorySubjects.map(s => (
                                                                <option key={s.id} value={s.id}>{s.name} ({s.code}) - {s.batch_name || 'No Batch'}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="slot-display" style={{
                                                            background: (val && subjectCounts[val] > 1) ? '#fee2e2' : 'transparent',
                                                            border: (val && subjectCounts[val] > 1) ? '1px solid #fca5a5' : 'none',
                                                            color: (val && subjectCounts[val] > 1) ? '#991b1b' : 'inherit',
                                                            borderRadius: '4px',
                                                            padding: '4px 6px',
                                                            display: 'flex',
                                                            flexDirection: 'column'
                                                        }}>
                                                            <span className="slot-subject" style={{ fontWeight: 500 }}>{getSubjectName(val)}</span>
                                                            {val && <span style={{ fontSize: '0.7rem', color: (subjectCounts[val] > 1) ? '#b91c1c' : '#94a3b8' }}>{getBatchName(val)}</span>}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        {Array.from({ length: labCount }, (_, i) => {
                                            const key = `lab${i + 1}`;
                                            const val = slots[key] || '';
                                            return (
                                                <td key={key}>
                                                    {isEditing ? (
                                                        <select className="form-input slot-select" value={val} onChange={e => handleSlotChange(key, e.target.value)}>
                                                            <option value="">—</option>
                                                            {labSubjects.map(s => (
                                                                <option key={s.id} value={s.id}>{s.name} ({s.code}) - {s.batch_name || 'No Batch'}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="slot-display" style={{
                                                            background: (val && subjectCounts[val] > 1) ? '#fee2e2' : 'transparent',
                                                            border: (val && subjectCounts[val] > 1) ? '1px solid #fca5a5' : 'none',
                                                            color: (val && subjectCounts[val] > 1) ? '#991b1b' : 'inherit',
                                                            borderRadius: '4px',
                                                            padding: '4px 6px',
                                                            display: 'flex',
                                                            flexDirection: 'column'
                                                        }}>
                                                            <span className="slot-subject" style={{ fontWeight: 500 }}>{getSubjectName(val)}</span>
                                                            {val && <span style={{ fontSize: '0.7rem', color: (subjectCounts[val] > 1) ? '#b91c1c' : '#94a3b8' }}>{getBatchName(val)}</span>}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td>
                                            {isEditing ? (
                                                <div className="action-btns">
                                                    <button className="btn btn-primary btn-sm" onClick={() => handleSave(faculty.id)} disabled={saving}>
                                                        {saving ? <Loader2 size={14} className="spinner" /> : <Check size={14} />} Save
                                                    </button>
                                                    <button className="btn btn-secondary btn-sm" onClick={handleCancel}><X size={14} /> Cancel</button>
                                                </div>
                                            ) : (
                                                <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(faculty.id, pref.subject_slots)}>
                                                    <Pencil size={14} /> Edit
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* Show conflict legend if any occur */}
            {Object.keys(subjectCounts).length > 0 && Object.values(subjectCounts).some(count => count > 1) && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.85rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={16} />
                    <span>Cells highlighted in red indicate that multiple faculties have selected the same subject. The algorithm will still attempt to allocate them both to that subject class. This is for your awareness.</span>
                </div>
            )}
        </div>
    );
}
