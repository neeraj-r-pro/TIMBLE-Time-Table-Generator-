import React, { useState, useEffect } from 'react';
import {
  Users,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Save,
  Pencil,
  X,
  Check,
  Settings
} from 'lucide-react';
import './TimetableSteps.css';
import { preferencesAPI, facultiesAPI, timetableManagementAPI, subjectsAPI } from '../../../services/api';

/**
 * Faculty Preferences Step - Enhanced
 * 1. Configure theory/lab slot counts
 * 2. View/edit faculty preferences
 */
export function FacultyPreferencesStep({ data, onComplete, onNext, onPrevious, isFirstStep }) {
  const [loading, setLoading] = useState(true);
  const [facultyPreferences, setFacultyPreferences] = useState({});
  const [faculties, setFaculties] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [saving, setSaving] = useState(false);

  // Slot config
  const [theorySlots, setTheorySlots] = useState(data.facultyPrefsData?.theorySlots || 3);
  const [labSlots, setLabSlots] = useState(data.facultyPrefsData?.labSlots || 2);

  // Editing state
  const [editingFacultyId, setEditingFacultyId] = useState(null);
  const [editSlots, setEditSlots] = useState({});

  const timetableId = data.basicInfo?.timetableId;
  const institutionId = data.basicInfo?.institutionId;

  const loadFacultyPreferences = async () => {
    try {
      setLoading(true);
      const [facultiesList, subjectsList] = await Promise.all([
        facultiesAPI.getAll(institutionId),
        subjectsAPI.getAll(null, institutionId),
      ]);
      setFaculties(facultiesList || []);
      setSubjects(subjectsList || []);

      const prefsMap = {};
      for (const faculty of facultiesList || []) {
        try {
          const prefs = timetableId
            ? await preferencesAPI.getByFaculty(faculty.id, timetableId)
            : await preferencesAPI.getByFaculty(faculty.id);
          if (prefs && (prefs.time_matrix || prefs.preferred_subjects || prefs.subject_slots)) {
            prefsMap[faculty.id] = {
              timeMatrix: prefs.time_matrix || {},
              preferredSubjects: prefs.preferred_subjects || [],
              subjectSlots: prefs.subject_slots || {},
              hasPreferences: true
            };
          } else {
            prefsMap[faculty.id] = { hasPreferences: false, subjectSlots: {} };
          }
        } catch {
          prefsMap[faculty.id] = { hasPreferences: false, subjectSlots: {} };
        }
      }
      setFacultyPreferences(prefsMap);

      // Load saved slot config from timetable
      if (timetableId) {
        try {
          const tt = await timetableManagementAPI.getById(timetableId);
          const config = tt?.config || {};
          if (config.theorySlots) setTheorySlots(config.theorySlots);
          if (config.labSlots) setLabSlots(config.labSlots);
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error('Error loading faculty preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacultyPreferences();
  }, [timetableId]);

  const saveSlotConfig = async () => {
    if (!timetableId) return;
    try {
      await timetableManagementAPI.update(timetableId, {
        config: { theorySlots, labSlots }
      });
    } catch (err) {
      console.error('Error saving slot config:', err);
    }
  };

  // Auto-save config when changed
  useEffect(() => {
    const timer = setTimeout(() => {
      if (timetableId) saveSlotConfig();
    }, 500);
    return () => clearTimeout(timer);
  }, [theorySlots, labSlots]);

  const theorySubjects = subjects.filter(s => s.type === 'theory');
  const labSubjects = subjects.filter(s => s.type === 'lab' || s.type === 'practical');

  const getSubjectName = (id) => {
    const s = subjects.find(sub => sub.id === id);
    return s ? `${s.name} (${s.code})` : '—';
  };

  const getBatchName = (id) => {
    const s = subjects.find(sub => sub.id === id);
    return s?.batch_name || '';
  };

  const handleEdit = (facultyId) => {
    const prefs = facultyPreferences[facultyId] || {};
    setEditingFacultyId(facultyId);
    setEditSlots(prefs.subjectSlots || {});
  };

  const handleCancel = () => {
    setEditingFacultyId(null);
    setEditSlots({});
  };

  const handleSlotChange = (key, value) => {
    setEditSlots(prev => ({ ...prev, [key]: value }));
  };

  const handleSavePrefs = async (facultyId) => {
    setSaving(true);
    try {
      await preferencesAPI.update(facultyId, {
        subjectSlots: editSlots,
        timetableId,
      });
      setEditingFacultyId(null);
      setEditSlots({});
      loadFacultyPreferences();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const facultyWithPrefs = Object.entries(facultyPreferences).filter(
    ([_, p]) => p.hasPreferences
  ).length;

  const handleContinue = () => {
    onComplete({
      facultyPreferences,
      preferencesLoaded: true,
      theorySlots,
      labSlots,
    });
  };

  if (loading) {
    return (
      <div className="timetable-step">
        <div className="step-header">
          <Users className="step-main-icon" />
          <h2>Faculty Preferences</h2>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="spinner" style={{ width: 48, height: 48 }} />
        </div>
      </div>
    );
  }

  // Pre-calculate subject allocation counts to identify conflicts for highlighting
  const subjectCounts = {};
  if (faculties && faculties.length > 0) {
    faculties.forEach(faculty => {
      const prefs = facultyPreferences[faculty.id] || {};
      const slots = prefs.subjectSlots || {};
      
      for (let i = 0; i < theorySlots; i++) {
        const val = slots[`theory${i + 1}`];
        if (val) subjectCounts[val] = (subjectCounts[val] || 0) + 1;
      }
      for (let i = 0; i < labSlots; i++) {
        const val = slots[`lab${i + 1}`];
        if (val) subjectCounts[val] = (subjectCounts[val] || 0) + 1;
      }
    });
  }

  return (
    <div className="timetable-step">
      <div className="step-header">
        <div className="step-icon-wrapper">
          <Users className="step-main-icon" />
        </div>
        <div className="step-title-section">
          <h2>Faculty Preferences</h2>
          <p>Configure preference slots and view/edit faculty selections</p>
        </div>
      </div>

      <div className="faculty-preferences-content">
        {/* Slot Configuration */}
        <div className="form-section">
          <div className="section-header">
            <h3><Settings size={18} style={{ marginRight: '0.5rem' }} /> Preference Slot Configuration</h3>
          </div>
          <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
            Set how many theory and lab subjects each faculty can choose as preferences.
          </p>
          <div className="form-grid" style={{ maxWidth: '400px' }}>
            <div className="form-group">
              <label>Theory Slots</label>
              <input
                type="number"
                min="0"
                max="10"
                className="form-input"
                value={theorySlots}
                onChange={e => setTheorySlots(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
            <div className="form-group">
              <label>Lab Slots</label>
              <input
                type="number"
                min="0"
                max="10"
                className="form-input"
                value={labSlots}
                onChange={e => setLabSlots(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="info-banner preferences-info">
          <CheckCircle className="info-icon success" />
          <div>
            <h4>Preferences Status</h4>
            <p><strong>{facultyWithPrefs}</strong> out of <strong>{faculties.length}</strong> faculty have set preferences.</p>
            {data.basicInfo?.timetableCode && (
              <p style={{ marginTop: '0.5rem' }}>
                Share code <strong>{data.basicInfo.timetableCode}</strong> with faculty to set preferences.
              </p>
            )}
          </div>
        </div>

        {/* Faculty Preferences Table */}
        {faculties.length > 0 && (theorySlots > 0 || labSlots > 0) && (
          <div className="form-section" style={{ overflow: 'auto' }}>
            <div className="section-header">
              <h3>Faculty Subject Preferences</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>Faculty</th>
                  {Array.from({ length: theorySlots }, (_, i) => (
                    <th key={`th${i}`} style={{ textAlign: 'left', padding: '0.625rem 0.75rem', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>Theory {i + 1}</th>
                  ))}
                  {Array.from({ length: labSlots }, (_, i) => (
                    <th key={`lb${i}`} style={{ textAlign: 'left', padding: '0.625rem 0.75rem', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>Lab {i + 1}</th>
                  ))}
                  <th style={{ textAlign: 'center', padding: '0.625rem 0.75rem', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {faculties.map(faculty => {
                  const prefs = facultyPreferences[faculty.id] || {};
                  const isEditing = editingFacultyId === faculty.id;
                  const slots = isEditing ? editSlots : (prefs.subjectSlots || {});

                  return (
                    <tr key={faculty.id} style={{ background: isEditing ? '#eff6ff' : undefined }}>
                      <td style={{ padding: '0.625rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>
                        {faculty.name}
                        {prefs.hasPreferences && <span style={{ marginLeft: '0.5rem', background: '#dcfce7', color: '#166534', padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.7rem' }}>Set</span>}
                      </td>
                      {Array.from({ length: theorySlots }, (_, i) => {
                        const key = `theory${i + 1}`;
                        const val = slots[key] || '';
                        return (
                          <td key={key} style={{ padding: '0.625rem 0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                            {isEditing ? (
                              <select className="form-input" style={{ fontSize: '0.8rem', padding: '0.375rem' }} value={val} onChange={e => handleSlotChange(key, e.target.value)}>
                                <option value="">—</option>
                                {theorySubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code}) {s.batch_name ? `[${s.batch_name}]` : ''}</option>)}
                              </select>
                            ) : (
                              <div style={{
                                padding: '4px 6px',
                                borderRadius: '4px',
                                background: (val && subjectCounts[val] > 1) ? '#fee2e2' : 'transparent',
                                border: (val && subjectCounts[val] > 1) ? '1px solid #fca5a5' : 'none',
                                color: (val && subjectCounts[val] > 1) ? '#991b1b' : 'inherit'
                              }}>
                                <div style={{ fontWeight: 500 }}>{getSubjectName(val)}</div>
                                {val && <div style={{ fontSize: '0.7rem', color: (subjectCounts[val] > 1) ? '#b91c1c' : '#94a3b8' }}>{getBatchName(val)}</div>}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      {Array.from({ length: labSlots }, (_, i) => {
                        const key = `lab${i + 1}`;
                        const val = slots[key] || '';
                        return (
                          <td key={key} style={{ padding: '0.625rem 0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                            {isEditing ? (
                              <select className="form-input" style={{ fontSize: '0.8rem', padding: '0.375rem' }} value={val} onChange={e => handleSlotChange(key, e.target.value)}>
                                <option value="">—</option>
                                {labSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code}) {s.batch_name ? `[${s.batch_name}]` : ''}</option>)}
                              </select>
                            ) : (
                              <div style={{
                                padding: '4px 6px',
                                borderRadius: '4px',
                                background: (val && subjectCounts[val] > 1) ? '#fee2e2' : 'transparent',
                                border: (val && subjectCounts[val] > 1) ? '1px solid #fca5a5' : 'none',
                                color: (val && subjectCounts[val] > 1) ? '#991b1b' : 'inherit'
                              }}>
                                <div style={{ fontWeight: 500 }}>{getSubjectName(val)}</div>
                                {val && <div style={{ fontSize: '0.7rem', color: (subjectCounts[val] > 1) ? '#b91c1c' : '#94a3b8' }}>{getBatchName(val)}</div>}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ padding: '0.625rem 0.75rem', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleSavePrefs(faculty.id)} disabled={saving}>
                              {saving ? <Loader2 size={14} className="spinner" /> : <Check size={14} />} Save
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={handleCancel}><X size={14} /></button>
                          </div>
                        ) : (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(faculty.id)}>
                            <Pencil size={14} /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Show conflict legend if any occur */}
            {Object.values(subjectCounts).some(count => count > 1) && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.85rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} />
                <span>Cells highlighted in red indicate that multiple faculties have selected the same subject. The algorithm will still attempt to allocate them both to that subject class. This is for your awareness.</span>
              </div>
            )}
          </div>
        )}

        <div className="warning-box">
          <AlertTriangle className="warning-icon" />
          <div className="warning-content">
            <h4>Before Generating</h4>
            <p>
              Ensure faculty have had a chance to set their preferences. You can proceed without them—the
              algorithm will generate a valid timetable and use preferences when available to improve satisfaction.
            </p>
          </div>
        </div>
      </div>

      <div className="step-actions">
        {!isFirstStep && (
          <button className="btn btn-secondary" onClick={onPrevious}>
            <ArrowLeft className="btn-icon-left" />
            Previous
          </button>
        )}
        <button className="btn btn-primary" onClick={handleContinue}>
          Continue
          <ArrowRight className="btn-icon-right" />
        </button>
      </div>
    </div>
  );
}
