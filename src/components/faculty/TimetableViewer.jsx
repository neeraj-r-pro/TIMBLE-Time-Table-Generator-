import React, { useState, useEffect } from 'react';
import { Download, Eye, Calendar, Users, Filter, Loader2, Key, X, Building2, Clock } from 'lucide-react';
import './TimetableViewer.css';
import '../../components/student/StudentTimetableViewer.css';
import { timetablesAPI, batchesAPI, facultiesAPI, timetableManagementAPI, preferencesAPI } from '../../services/api';
import {
  buildSubjectIdToFacultyNamesMap,
  computeTeachingContinuationFlags,
  formatFacultyListForSubject,
  mergedTimeLabelForRun,
} from '../../utils/timetableDisplayUtils';

const TimetableViewer = () => {
  const [selectedView, setSelectedView] = useState('personal');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [batches, setBatches] = useState([]);
  const [personalTimetable, setPersonalTimetable] = useState([]);
  const [batchTimetables, setBatchTimetables] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [facultyId, setFacultyId] = useState(null);
  const [selectedTimetableId, setSelectedTimetableId] = useState(null);
  const [selectedTimetableName, setSelectedTimetableName] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [institutionTimetables, setInstitutionTimetables] = useState([]);

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.id) {
          // Try to get faculty ID from user object or fetch from faculties
          fetchFacultyId(user);
          fetchFacultyInstitutions();
        }
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (facultyId) {
      fetchPersonalTimetable();
    }
  }, [facultyId, selectedTimetableId]);

  useEffect(() => {
    if (selectedBatch && selectedView === 'batch') {
      fetchBatchTimetable(selectedBatch);
    }
  }, [selectedBatch, selectedView, selectedTimetableId]);

  useEffect(() => {
    if (selectedInstitutionId) {
      fetchTimetablesForInstitution(selectedInstitutionId);
    } else {
      setInstitutionTimetables([]);
    }
  }, [selectedInstitutionId]);

  const fetchFacultyId = async (user) => {
    try {
      const faculties = await facultiesAPI.getAll();
      const faculty = faculties.find((f) => f.user_id === user.id || f.email === user.email);
      if (faculty) {
        setFacultyId(faculty.id);
      }
    } catch (err) {
      console.error('Error fetching faculty ID:', err);
    }
  };

  const fetchFacultyInstitutions = async () => {
    try {
      const data = await facultiesAPI.getMyInstitutions();
      setInstitutions(data || []);
      if (data && data.length > 0 && !selectedInstitutionId) {
        setSelectedInstitutionId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching faculty institutions:', err);
    }
  };

  const fetchBatches = async (institutionId) => {
    try {
      setLoading(true);
      const data = await batchesAPI.getAll(null, institutionId || null);
      setBatches(data || []);
    } catch (err) {
      console.error('Error fetching batches:', err);
      setError(err.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  // When a timetable is selected, find which batches have entries in it
  const [timetableBatchIds, setTimetableBatchIds] = useState(null); // null = show all batches

  useEffect(() => {
    if (!selectedTimetableId) {
      setTimetableBatchIds(null);
      return;
    }
    // Fetch entries for the timetable and extract distinct batch_ids
    timetablesAPI.getAll({ timetableId: selectedTimetableId })
      .then(entries => {
        const ids = [...new Set((entries || []).map(e => e.batch_id).filter(Boolean))];
        setTimetableBatchIds(ids);
      })
      .catch(() => setTimetableBatchIds(null));
  }, [selectedTimetableId]);

  // Batches to show in the dropdown — filtered by timetable if one is selected
  const visibleBatches = timetableBatchIds
    ? batches.filter(b => timetableBatchIds.includes(b.id))
    : batches;
  useEffect(() => {
    if (selectedInstitutionId) {
      fetchBatches(selectedInstitutionId);
    } else {
      setBatches([]);
      setSelectedBatch('');
    }
  }, [selectedInstitutionId]);

  const fetchPersonalTimetable = async () => {
    if (!facultyId) return;

    try {
      setLoading(true);
      const filters = { facultyId };
      if (selectedTimetableId) {
        filters.timetableId = selectedTimetableId;
      }
      const entries = await timetablesAPI.getAll(filters);

      let prefsRows = [];
      if (selectedTimetableId) {
        try {
          prefsRows = await preferencesAPI.getAllForTimetable(selectedTimetableId);
        } catch (e) {
          console.warn('preferences for timetable:', e);
        }
      }
      const subjectFacultyMap = buildSubjectIdToFacultyNamesMap(prefsRows);

      const transformed = entries.map((entry) => ({
        day: entry.day_of_week.charAt(0).toUpperCase() + entry.day_of_week.slice(1),
        time: `${entry.start_time} - ${entry.end_time}`,
        subject: entry.subject?.name || 'TBA',
        batch: entry.batch?.name || entry.batch?.code || 'TBA',
        room: entry.room?.name || 'TBA',
        faculty: formatFacultyListForSubject(
          entry.subject_id || entry.subject?.id,
          entry.faculty?.name || '',
          subjectFacultyMap
        ),
        subjectId: entry.subject_id || entry.subject?.id,
        _subjectId: entry.subject_id || entry.subject?.id,
      }));

      setPersonalTimetable(transformed);
    } catch (err) {
      console.error('Error fetching personal timetable:', err);
      setError(err.message || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchTimetable = async (batchId) => {
    try {
      setLoading(true);
      const filters = { batchId };
      if (selectedTimetableId) {
        filters.timetableId = selectedTimetableId;
      }
      const entries = await timetablesAPI.getAll(filters);

      let prefsRows = [];
      if (selectedTimetableId) {
        try {
          prefsRows = await preferencesAPI.getAllForTimetable(selectedTimetableId);
        } catch (e) {
          console.warn('preferences for timetable:', e);
        }
      }
      const subjectFacultyMap = buildSubjectIdToFacultyNamesMap(prefsRows);

      const transformed = entries.map((entry) => ({
        day: entry.day_of_week.charAt(0).toUpperCase() + entry.day_of_week.slice(1),
        time: `${entry.start_time} - ${entry.end_time}`,
        subject: entry.subject?.name || 'TBA',
        faculty: formatFacultyListForSubject(
          entry.subject_id || entry.subject?.id,
          entry.faculty?.name || '',
          subjectFacultyMap
        ),
        room: entry.room?.name || 'TBA',
        subjectId: entry.subject_id || entry.subject?.id,
        _subjectId: entry.subject_id || entry.subject?.id,
      }));

      setBatchTimetables((prev) => ({
        ...prev,
        [batchId]: transformed,
      }));
    } catch (err) {
      console.error('Error fetching batch timetable:', err);
      setError(err.message || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetablesForInstitution = async (institutionId) => {
    try {
      setLoading(true);
      setError(null);
      const records = await timetableManagementAPI.getAll({ institutionId });
      setInstitutionTimetables(records || []);
    } catch (err) {
      console.error('Error fetching timetables for institution:', err);
      setError(err.message || 'Failed to load timetables for selected institution');
    } finally {
      setLoading(false);
    }
  };

  const clearTimetableSelection = () => {
    setSelectedTimetableId(null);
    setSelectedTimetableName(null);
    setBatchTimetables({});
    setInstitutionTimetables([]);
    if (selectedBatch) {
      fetchBatchTimetable(selectedBatch);
    }
    if (facultyId) {
      fetchPersonalTimetable();
    }
  };

  const handleExportTimetable = (type) => {
    let data, filename;

    if (type === 'personal') {
      if (personalTimetable.length === 0) {
        alert('No timetable data to export');
        return;
      }
      data = personalTimetable;
      filename = 'my_timetable.csv';
    } else {
      if (!selectedBatch || !batchTimetables[selectedBatch] || batchTimetables[selectedBatch].length === 0) {
        alert('No timetable data to export');
        return;
      }
      data = batchTimetables[selectedBatch];
      const batchName = batches.find(b => b.id === selectedBatch)?.name || 'batch';
      filename = `timetable_${batchName.replace(/\s+/g, '_')}.csv`;
    }

    const csvContent = [
      type === 'personal' ? ['Day', 'Time', 'Subject', 'Faculty', 'Batch', 'Room'] : ['Day', 'Time', 'Subject', 'Faculty', 'Room'],
      ...data.map(item =>
        type === 'personal'
          ? [item.day, item.time, item.subject, item.faculty || '', item.batch, item.room]
          : [item.day, item.time, item.subject, item.faculty, item.room]
      )
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const renderPersonalTimetable = () => (
    <div className="timetable-container">
      <div className="timetable-header">
        <h3>My Personal Timetable</h3>
        {personalTimetable.length > 0 && (
          <button
            onClick={() => handleExportTimetable('personal')}
            className="btn btn-primary"
          >
            <Download className="btn-icon" />
            Export CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <Loader2 className="spinner" />
          <p>Loading timetable...</p>
        </div>
      ) : personalTimetable.length > 0 ? (() => {
        const timeSlots = Array.from(new Set(personalTimetable.map(item => item.time))).sort();
        return (
          <div className="student-timetable-content">
            <table className="student-timetable-grid" role="grid">
              <thead>
                <tr className="student-timetable-header-row">
                  <th className="student-time-header" scope="col">Day</th>
                  {timeSlots.map(slot => (
                    <th key={slot} className="student-day-header" scope="col">{slot}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => {
                  const dayPeriods = timeSlots
                    .map(ts => {
                      const s = personalTimetable.find(item =>
                        item.day.toLowerCase() === day.toLowerCase() && item.time === ts
                      );
                      if (!s) return null;
                      return {
                        time: ts,
                        subject: s.subject,
                        faculty: s.faculty,
                        _subjectId: s._subjectId,
                        type: 'theory',
                      };
                    })
                    .filter(Boolean);
                  const { skip } = computeTeachingContinuationFlags(dayPeriods, timeSlots);
                  const mergeRunLen = (start) => {
                    if (skip[start]) return 0;
                    let n = 1;
                    for (let k = start + 1; k < timeSlots.length && skip[k]; k++) n++;
                    return n;
                  };

                  return (
                    <tr key={day} className="student-timetable-row">
                      <th className="student-time-cell" scope="row">{day}</th>
                      {timeSlots.map((timeSlot, colIdx) => {
                        if (skip[colIdx]) {
                          return (
                            <td
                              key={`${day}-${timeSlot}-m`}
                              className="student-schedule-cell slot-merged-follow"
                              aria-hidden="true"
                            />
                          );
                        }
                        const slot = personalTimetable.find(item =>
                          item.day.toLowerCase() === day.toLowerCase() && item.time === timeSlot
                        );
                        const runLen = mergeRunLen(colIdx);
                        const timeLabel = runLen > 1
                          ? mergedTimeLabelForRun(dayPeriods, timeSlots, colIdx, skip)
                          : null;

                        return (
                          <td
                            key={`${day}-${timeSlot}`}
                            className={`student-schedule-cell${runLen > 1 ? ' slot-merged-start' : ''}`}
                          >
                            {slot ? (
                              <div className="student-schedule-item">
                                {timeLabel && (
                                  <div className="student-teacher" style={{ fontWeight: 600, color: '#0369a1' }}>
                                    {timeLabel}
                                  </div>
                                )}
                                <div className="student-subject">{slot.subject}</div>
                                <div className="student-teacher">{slot.faculty}</div>
                                <div className="student-room">Batch: {slot.batch}</div>
                                <div className="student-room">{slot.room}</div>
                              </div>
                            ) : (
                              <div className="student-empty-slot">-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })() : (
        <div className="empty-state">
          <Calendar className="empty-icon" />
          <p>No timetable entries found for you.</p>
        </div>
      )}
    </div>
  );

  const renderBatchTimetable = () => {
    const currentData = batchTimetables[selectedBatch] || [];
    const timeSlots = Array.from(new Set(currentData.map(item => item.time))).sort();

    return (
      <div className="timetable-container">
        <div className="timetable-header">
          <div className="batch-selector">
            <label>Select Batch:</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="form-select"
            >
              <option value="">Choose a batch...</option>
              {visibleBatches.map(batch => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} ({batch.code})
                </option>
              ))}
            </select>
          </div>
          {selectedBatch && currentData.length > 0 && (
            <button onClick={() => handleExportTimetable('batch')} className="btn btn-primary">
              <Download className="btn-icon" /> Export CSV
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-container">
            <Loader2 className="spinner" />
            <p>Loading timetable...</p>
          </div>
        ) : selectedBatch ? (
          currentData.length > 0 && timeSlots.length > 0 ? (
            <div className="student-timetable-content">
              <table className="student-timetable-grid" role="grid">
                <thead>
                  <tr className="student-timetable-header-row">
                    <th className="student-time-header" scope="col">Day</th>
                    {timeSlots.map(slot => (
                      <th key={slot} className="student-day-header" scope="col">{slot}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map(day => {
                    const dayPeriods = timeSlots
                      .map(ts => {
                        const s = currentData.find(item =>
                          item.day.toLowerCase() === day.toLowerCase() && item.time === ts
                        );
                        if (!s) return null;
                        return {
                          time: ts,
                          subject: s.subject,
                          faculty: s.faculty,
                          _subjectId: s._subjectId,
                          type: 'theory',
                        };
                      })
                      .filter(Boolean);
                    const { skip } = computeTeachingContinuationFlags(dayPeriods, timeSlots);
                    const mergeRunLen = (start) => {
                      if (skip[start]) return 0;
                      let n = 1;
                      for (let k = start + 1; k < timeSlots.length && skip[k]; k++) n++;
                      return n;
                    };

                    return (
                      <tr key={day} className="student-timetable-row">
                        <th className="student-time-cell" scope="row">{day}</th>
                        {timeSlots.map((timeSlot, colIdx) => {
                          if (skip[colIdx]) {
                            return (
                              <td
                                key={`${day}-${timeSlot}-m`}
                                className="student-schedule-cell slot-merged-follow"
                                aria-hidden="true"
                              />
                            );
                          }
                          const slot = currentData.find(item =>
                            item.day.toLowerCase() === day.toLowerCase() && item.time === timeSlot
                          );
                          const runLen = mergeRunLen(colIdx);
                          const timeLabel = runLen > 1
                            ? mergedTimeLabelForRun(dayPeriods, timeSlots, colIdx, skip)
                            : null;

                          return (
                            <td
                              key={`${day}-${timeSlot}`}
                              className={`student-schedule-cell${runLen > 1 ? ' slot-merged-start' : ''}`}
                            >
                              {slot ? (
                                <div className="student-schedule-item">
                                  {timeLabel && (
                                    <div className="student-teacher" style={{ fontWeight: 600, color: '#0369a1' }}>
                                      {timeLabel}
                                    </div>
                                  )}
                                  <div className="student-subject">{slot.subject}</div>
                                  <div className="student-teacher">{slot.faculty}</div>
                                  <div className="student-room">{slot.room}</div>
                                </div>
                              ) : (
                                <div className="student-empty-slot">-</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Calendar className="empty-icon" />
              <p>No timetable data available for this batch</p>
            </div>
          )
        ) : (
          <div className="empty-state">
            <Calendar className="empty-icon" />
            <p>Select a batch to view its timetable</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="timetable-viewer">
      <div className="viewer-header">
        <div>
          <h1>View Timetables</h1>
          <p className="viewer-subtitle">View and export timetables for batches and your personal schedule</p>
        </div>
      </div>

      <div className="viewer-content">
        {institutions.length > 0 && (
          <div className="view-selector" style={{ marginBottom: '1rem' }}>
            <div className="batch-selector">
              <label>
                <Building2 className="tab-icon" />
                Select Institution:
              </label>
              <select
                value={selectedInstitutionId}
                onChange={(e) => {
                  setSelectedInstitutionId(e.target.value);
                  setSelectedTimetableId(null);
                  setSelectedTimetableName(null);
                  setBatchTimetables({});
                }}
                className="form-select"
              >
                <option value="">Select institution…</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.code})
                  </option>
                ))}
              </select>
            </div>

            {selectedInstitutionId && institutionTimetables.length > 0 && (
              <div className="batch-selector" style={{ marginLeft: '1rem' }}>
                <label>Select Timetable in Institution:</label>
                <select
                  value={selectedTimetableId || ''}
                  onChange={(e) => {
                    const ttId = e.target.value || null;
                    setSelectedTimetableId(ttId);
                    const tt = institutionTimetables.find((t) => t.id === ttId);
                    setSelectedTimetableName(tt ? tt.name : null);
                  }}
                  className="form-select"
                >
                  <option value="">All timetables</option>
                  {institutionTimetables.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name} ({tt.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="view-selector">
          <button
            className={`view-tab ${selectedView === 'personal' ? 'active' : ''}`}
            onClick={() => setSelectedView('personal')}
          >
            <Calendar className="tab-icon" />
            My Timetable
          </button>
          <button
            className={`view-tab ${selectedView === 'batch' ? 'active' : ''}`}
            onClick={() => setSelectedView('batch')}
          >
            <Users className="tab-icon" />
            Batch Timetables
          </button>
        </div>

        {selectedTimetableName && (
          <div className="timetable-selection-banner">
            <span>Viewing timetable: <strong>{selectedTimetableName}</strong></span>
            <button
              className="btn btn-sm btn-secondary"
              onClick={clearTimetableSelection}
            >
              Clear Selection
            </button>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        <div className="viewer-body">
          {selectedView === 'personal' ? renderPersonalTimetable() : renderBatchTimetable()}
        </div>
      </div>

    </div>
  );
};

export default TimetableViewer;
