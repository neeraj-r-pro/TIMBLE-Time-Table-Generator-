import React, { useState, useEffect } from 'react';
import { Save, Clock, BookOpen, Loader2, KeyRound, AlertCircle, Building2 } from 'lucide-react';
import './PreferenceManagement.css';
import { preferencesAPI, timetableManagementAPI, authAPI, facultiesAPI } from '../../services/api';

/**
 * Faculty preferences - timetable code first workflow
 * 1. Faculty selects institution + timetable
 * 2. Load timetable's schedule, subjects, and slot config
 * 3. Set time preferences and subject slot preferences (Theory 1, Theory 2, Lab 1, Lab 2, etc.)
 */
const PreferenceManagement = () => {
  const [step, setStep] = useState('code'); // 'code' | 'preferences'
  const [timetableCode, setTimetableCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [timetable, setTimetable] = useState(null);
  const [facultyId, setFacultyId] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [institutionTimetables, setInstitutionTimetables] = useState([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState('');

  const [timeMatrix, setTimeMatrix] = useState({});
  const [subjectSlots, setSubjectSlots] = useState({}); // {theory1: subjectId, theory2: ..., lab1: ..., lab2: ...}

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = {
    monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
    thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday'
  };

  useEffect(() => {
    fetchFacultyInstitutions();
  }, []);

  useEffect(() => {
    if (selectedInstitutionId) {
      fetchTimetablesForInstitution(selectedInstitutionId);
    } else {
      setInstitutionTimetables([]);
      setSelectedTimetableId('');
    }
  }, [selectedInstitutionId]);

  const fetchFacultyInstitutions = async () => {
    try {
      setLoading(true);
      const data = await facultiesAPI.getMyInstitutions();
      setInstitutions(data || []);
      if (data && data.length > 0 && !selectedInstitutionId) {
        setSelectedInstitutionId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching faculty institutions:', err);
      setCodeError('Failed to load institutions');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetablesForInstitution = async (institutionId) => {
    try {
      const data = await timetableManagementAPI.getAll({ institutionId });
      setInstitutionTimetables(data || []);
      if (data && data.length > 0) {
        setSelectedTimetableId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching timetables:', err);
    }
  };

  const handleSelectionSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedTimetableId) {
      setCodeError('Please select a timetable');
      return;
    }

    const selectedTimetable = institutionTimetables.find(t => t.id === selectedTimetableId);
    if (!selectedTimetable) return;

    setLoading(true);
    setCodeError('');
    try {
      const user = authAPI.getCurrentUser();
      if (!user) {
        setCodeError('Please login first');
        setLoading(false);
        return;
      }

      const faculties = await facultiesAPI.getAll();
      const faculty = faculties.find(f => f.user_id === user.id || f.email === user.email);
      if (!faculty) {
        setCodeError('Faculty profile not found');
        setLoading(false);
        return;
      }
      setFacultyId(faculty.id);

      const fullTimetable = await timetableManagementAPI.getByCodeFull(selectedTimetable.code);
      setTimetable(fullTimetable);

      const prefs = await preferencesAPI.getByFaculty(faculty.id, fullTimetable.id);
      if (prefs) {
        setTimeMatrix(prefs.time_matrix || {});
        setSubjectSlots(prefs.subject_slots || {});
      }

      setStep('preferences');
    } catch (err) {
      console.error('Error loading timetable:', err);
      setCodeError(err.message || 'Invalid timetable code. Get the code from your institution.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeTimetable = () => {
    setStep('code');
    setTimetable(null);
    setTimetableCode('');
    setCodeError('');
    setTimeMatrix({});
    setSubjectSlots({});
  };

  // Slot config from timetable
  const theorySlotCount = timetable?.config?.theorySlots || 3;
  const labSlotCount = timetable?.config?.labSlots || 2;

  // Subject lists separated by type, filtered to semester batches
  const allSubjects = timetable?.subjects || [];
  const theorySubjects = allSubjects.filter(s => s.type === 'theory');
  const labSubjects = allSubjects.filter(s => s.type === 'lab' || s.type === 'practical');

  const buildTimeSlotsFromSchedule = () => {
    const scheduleList = timetable?.scheduleList;
    const scheduleMaps = [];
    if (Array.isArray(scheduleList) && scheduleList.length > 0) {
      scheduleList.forEach(sch => scheduleMaps.push(sch.days || {}));
    } else {
      scheduleMaps.push(timetable?.schedule || {});
    }

    const slotsMap = new Map();
    scheduleMaps.forEach(schedule => {
      daysOfWeek.forEach(day => {
        const periods = schedule[day] || [];
        periods.filter(p => p.type === 'class').forEach(p => {
          const start = (p.startTime || p.start_time || '').substring(0, 5);
          const end = (p.endTime || p.end_time || '').substring(0, 5);
          const key = `${start}-${end}`;
          if (!slotsMap.has(key)) {
            slotsMap.set(key, { start, end, label: `${start}\n${end}`, key });
          }
        });
      });
    });
    return Array.from(slotsMap.values()).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  };

  const getTimeSlotsForDay = (day) => {
    const schedule = timetable?.schedule || {};
    const periods = (schedule[day] || []).filter(p => p.type === 'class');
    const slots = [];
    const seen = new Set();
    periods.forEach(p => {
      const key = `${p.startTime || p.start_time}-${p.endTime || p.end_time}`;
      if (!seen.has(key)) {
        seen.add(key);
        const start = (p.startTime || p.start_time || '').substring(0, 5);
        const end = (p.endTime || p.end_time || '').substring(0, 5);
        slots.push({ start, end, label: `${start} - ${end}`, key });
      }
    });
    return slots.sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  };

  // Click-to-cycle: null → 'preferred' → 'avoid' → null
  const handleTimeMatrixCycle = (day, timeKey) => {
    setTimeMatrix(prev => {
      const next = { ...prev };
      if (!next[day]) next[day] = {};
      const current = next[day][timeKey] || null;
      if (current === null) {
        next[day] = { ...next[day], [timeKey]: 'preferred' };
      } else if (current === 'preferred') {
        next[day] = { ...next[day], [timeKey]: 'avoid' };
      } else {
        const { [timeKey]: _, ...rest } = next[day];
        next[day] = rest;
        if (Object.keys(next[day]).length === 0) delete next[day];
      }
      return next;
    });
  };

  const handleSlotChange = (slotKey, value) => {
    setSubjectSlots(prev => ({ ...prev, [slotKey]: value }));
  };

  const handleSavePreferences = async () => {
    if (!facultyId || !timetable) return;

    setSaving(true);
    try {
      await preferencesAPI.update(facultyId, {
        timeMatrix,
        subjectSlots,
        timetableId: timetable.id
      });
      alert('Preferences saved successfully!');
    } catch (err) {
      console.error('Error saving preferences:', err);
      const detail = err.details || err.message || 'Failed to save preferences.';
      alert(detail);
    } finally {
      setSaving(false);
    }
  };

  const getTimeMatrixValue = (day, timeKey) => timeMatrix[day]?.[timeKey] || null;

  const allTimeSlots = buildTimeSlotsFromSchedule();

  if (step === 'code') {
    return (
      <div className="preference-management">
        <div className="preference-header">
          <div>
            <h1>Set Your Preferences</h1>
            <p className="preference-subtitle">Select your timetable to set teaching preferences</p>
          </div>
        </div>

        <div className="code-entry-card">
          <div className="code-entry-icon">
            <Building2 />
          </div>
          <h3>Select Your Timetable</h3>
          <p>Select your institution and the specific timetable you want to set preferences for.</p>
          <form onSubmit={handleSelectionSubmit} className="code-entry-form">
            <div className="form-group">
              <label>Institution</label>
              <select
                className="form-select"
                value={selectedInstitutionId}
                onChange={(e) => setSelectedInstitutionId(e.target.value)}
                disabled={loading}
              >
                <option value="">Select Institution</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Timetable</label>
              <select
                className="form-select"
                value={selectedTimetableId}
                onChange={(e) => setSelectedTimetableId(e.target.value)}
                disabled={loading || !selectedInstitutionId}
              >
                <option value="">Select Timetable</option>
                {institutionTimetables.map(tt => (
                  <option key={tt.id} value={tt.id}>{tt.name} ({tt.code})</option>
                ))}
              </select>
            </div>

            {codeError && (
              <div className="code-error" style={{ marginTop: '1rem' }}>
                <AlertCircle size={16} />
                {codeError}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1.5rem', width: '100%' }} disabled={loading || !selectedTimetableId}>
              {loading ? (
                <>
                  <Loader2 className="btn-icon spinner" />
                  Loading...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="preference-management">
      <div className="preference-header">
        <div>
          <h1>Preferences for {timetable?.name}</h1>
          <p className="preference-subtitle">Code: {timetable?.code} • <button type="button" className="link-btn" onClick={handleChangeTimetable}>Change timetable</button></p>
        </div>
        <button onClick={handleSavePreferences} className="btn btn-primary" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="btn-icon spinner" />
              Saving...
            </>
          ) : (
            <>
              <Save className="btn-icon" />
              Save Preferences
            </>
          )}
        </button>
      </div>

      <div className="preference-content">
        {/* Time Preferences Matrix */}
        <div className="preference-card">
          <div className="preference-card-header">
            <div className="preference-card-title">
              <Clock className="preference-icon" />
              <h3>Time Preferences Matrix</h3>
            </div>
          </div>
          <div className="time-matrix-container">
            {allTimeSlots.length === 0 ? (
              <div className="empty-state">
                <Clock className="empty-icon" />
                <p>No schedule defined yet</p>
                <p className="empty-subtitle">The creator must define the schedule before you can set time preferences</p>
              </div>
            ) : (
              <>
                <div className="matrix-legend">
                  <div className="legend-item"><div className="legend-square neutral"></div><span>No preference</span></div>
                  <div className="legend-item"><div className="legend-square preferred"></div><span>Can take</span></div>
                  <div className="legend-item"><div className="legend-square avoid"></div><span>Cannot take</span></div>
                  <p className="legend-hint">Click a square to cycle: No preference → Can take → Cannot take</p>
                </div>
                <div className="pref-grid-wrapper">
                  <div className="pref-grid" style={{ gridTemplateColumns: `80px repeat(${allTimeSlots.length}, 1fr)` }}>
                    {/* Header row */}
                    <div className="pref-grid-corner">Day / Time</div>
                    {allTimeSlots.map((slot, idx) => (
                      <div key={idx} className="pref-grid-time-header">
                        <span>{slot.start}</span>
                        <span>{slot.end}</span>
                      </div>
                    ))}
                    {/* Day rows */}
                    {daysOfWeek.filter(day => {
                      return getTimeSlotsForDay(day).length > 0;
                    }).map(day => {
                      const daySlots = getTimeSlotsForDay(day);
                      const dayMap = new Map(daySlots.map(s => [s.key, s]));
                      return (
                        <React.Fragment key={day}>
                          <div className="pref-grid-day">{dayLabels[day]}</div>
                          {allTimeSlots.map((slot, idx) => {
                            const hasSlot = dayMap.has(slot.key);
                            const value = getTimeMatrixValue(day, slot.key);
                            const stateClass = hasSlot ? (value === 'preferred' ? 'preferred' : value === 'avoid' ? 'avoid' : 'neutral') : 'disabled';
                            return (
                              <div
                                key={idx}
                                className={`pref-grid-cell ${stateClass}`}
                                onClick={() => hasSlot && handleTimeMatrixCycle(day, slot.key)}
                                title={hasSlot ? `${dayLabels[day]} ${slot.start}-${slot.end}: ${value === 'preferred' ? 'Can take' : value === 'avoid' ? 'Cannot take' : 'No preference'}` : 'No class this slot'}
                              />
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Subject Slot Preferences */}
        <div className="preference-card">
          <div className="preference-card-header">
            <div className="preference-card-title">
              <BookOpen className="preference-icon" />
              <h3>Subject Preferences</h3>
            </div>
          </div>
          <div className="subject-preferences-container">
            {(theorySlotCount === 0 && labSlotCount === 0) ? (
              <div className="empty-state">
                <BookOpen className="empty-icon" />
                <p>No subject preference slots configured</p>
                <p className="empty-subtitle">The creator has not yet configured the number of theory and lab slots.</p>
              </div>
            ) : (
              <>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  Select your preferred subjects for each slot. {theorySlotCount > 0 && `${theorySlotCount} theory slot${theorySlotCount > 1 ? 's' : ''}`}{theorySlotCount > 0 && labSlotCount > 0 && ' and '}{labSlotCount > 0 && `${labSlotCount} lab slot${labSlotCount > 1 ? 's' : ''}`} available.
                </p>

                {/* Theory Slots */}
                {theorySlotCount > 0 && (
                  <div className="slot-section">
                    <h4 className="slot-section-title">
                      <span className="slot-type-badge theory">Theory</span>
                      Theory Subjects
                    </h4>
                    <div className="slots-grid">
                      {Array.from({ length: theorySlotCount }, (_, i) => {
                        const key = `theory${i + 1}`;
                        const val = subjectSlots[key] || '';
                        const selectedSubject = theorySubjects.find(s => s.id === val);
                        return (
                          <div key={key} className="slot-item">
                            <label className="slot-label">Theory {i + 1}</label>
                            <select
                              className="form-select slot-dropdown"
                              value={val}
                              onChange={e => handleSlotChange(key, e.target.value)}
                            >
                              <option value="">— Select Subject —</option>
                              {theorySubjects.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.code}) - {s.batch_name || 'No Batch'}
                                </option>
                              ))}
                            </select>
                            {selectedSubject?.batch_name && (
                              <span className="slot-batch-hint">Batch: {selectedSubject.batch_name}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lab Slots */}
                {labSlotCount > 0 && (
                  <div className="slot-section" style={{ marginTop: '1.5rem' }}>
                    <h4 className="slot-section-title">
                      <span className="slot-type-badge lab">Lab</span>
                      Lab Subjects
                    </h4>
                    <div className="slots-grid">
                      {Array.from({ length: labSlotCount }, (_, i) => {
                        const key = `lab${i + 1}`;
                        const val = subjectSlots[key] || '';
                        const selectedSubject = labSubjects.find(s => s.id === val);
                        return (
                          <div key={key} className="slot-item">
                            <label className="slot-label">Lab {i + 1}</label>
                            <select
                              className="form-select slot-dropdown"
                              value={val}
                              onChange={e => handleSlotChange(key, e.target.value)}
                            >
                              <option value="">— Select Subject —</option>
                              {labSubjects.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.code}) - {s.batch_name || 'No Batch'}
                                </option>
                              ))}
                            </select>
                            {selectedSubject?.batch_name && (
                              <span className="slot-batch-hint">Batch: {selectedSubject.batch_name}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferenceManagement;
