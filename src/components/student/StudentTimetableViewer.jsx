import React, { useState, useEffect } from 'react';
import { Calendar, Download, Loader2 } from 'lucide-react';
import './StudentTimetableViewer.css';
import { timetablesAPI, batchesAPI, preferencesAPI } from '../../services/api';
import {
  buildSubjectIdToFacultyNamesMap,
  computeTeachingContinuationFlags,
  formatFacultyListForSubject,
  mergedTimeLabelForRun,
} from '../../utils/timetableDisplayUtils';

const StudentTimetableViewer = () => {
  const [selectedBatch, setSelectedBatch] = useState('');
  const [batches, setBatches] = useState([]);
  const [timetableData, setTimetableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timetableId, setTimetableId] = useState(null);

  useEffect(() => {
    // Get timetable info from user session
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.timetableId) {
          setTimetableId(user.timetableId);
        }
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchTimetable(selectedBatch);
    } else {
      setTimetableData([]);
    }
  }, [selectedBatch, timetableId]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const data = await batchesAPI.getAll();
      setBatches(data || []);
    } catch (err) {
      console.error('Error fetching batches:', err);
      setError(err.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetable = async (batchId) => {
    try {
      setLoading(true);
      const filters = { batchId };
      if (timetableId) {
        filters.timetableId = timetableId;
      }
      const entries = await timetablesAPI.getAll(filters);

      let prefsRows = [];
      if (timetableId) {
        try {
          prefsRows = await preferencesAPI.getAllForTimetable(timetableId);
        } catch (e) {
          console.warn('Could not load faculty preferences for timetable:', e);
        }
      }
      const subjectFacultyMap = buildSubjectIdToFacultyNamesMap(prefsRows);

      const transformed = entries.map(entry => {
        const sid = entry.subject_id || entry.subject?.id;
        const primary = entry.faculty?.name || '';
        const teachers = formatFacultyListForSubject(sid, primary, subjectFacultyMap);
        return {
          id: entry.id,
          day: entry.day_of_week.charAt(0).toUpperCase() + entry.day_of_week.slice(1),
          time: `${entry.start_time} - ${entry.end_time}`,
          subject: entry.subject?.name || 'TBA',
          teacher: teachers,
          room: entry.room?.name || 'TBA',
          type: entry.subject?.type || 'theory',
          subjectId: sid,
          _subjectId: sid,
        };
      });

      setTimetableData(transformed);
    } catch (err) {
      console.error('Error fetching timetable:', err);
      setError(err.message || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Get unique time slots from timetable data
  const timeSlots = Array.from(new Set(timetableData.map(item => item.time))).sort();

  const handleExport = () => {
    if (timetableData.length === 0) {
      alert('No timetable data to export');
      return;
    }

    // Create CSV content
    const csvContent = [
      ['Day', 'Time', 'Subject', 'Teacher', 'Room', 'Type'],
      ...timetableData.map(item => [
        item.day,
        item.time,
        item.subject,
        item.teacher,
        item.room,
        item.type
      ])
    ].map(row => row.join(',')).join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    const batchName = batches.find(b => b.id === selectedBatch)?.name || 'timetable';
    a.href = url;
    a.download = `timetable_${batchName.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading && !selectedBatch) {
    return (
      <div className="student-timetable-container">
        <div className="loading-container">
          <Loader2 className="spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-timetable-container">
      {selectedBatch && (
        <div className="student-timetable-header">
          <div className="student-timetable-title">
            <Calendar className="student-title-icon" />
            <h1>View Timetable</h1>
          </div>
          {timetableData.length > 0 && (
            <button className="student-export-button" onClick={handleExport}>
              <Download className="student-export-icon" />
              Export Timetable
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => selectedBatch ? fetchTimetable(selectedBatch) : fetchBatches()}>Retry</button>
        </div>
      )}

      <div className="student-timetable-filters">
        <div className="student-filter-group">
          <label htmlFor="batch">Batch</label>
          <select
            id="batch"
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="student-filter-select"
          >
            <option value="">Select Batch</option>
            {batches.map(batch => (
              <option key={batch.id} value={batch.id}>
                {batch.name} ({batch.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedBatch ? (
        loading ? (
          <div className="loading-container">
            <Loader2 className="spinner" />
            <p>Loading timetable...</p>
          </div>
        ) : timetableData.length > 0 ? (
          <div className="student-timetable-content">
            {timeSlots.length > 0 ? (
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
                  {days.map(day => {
                    const dayPeriods = timeSlots
                      .map(ts => {
                        const s = timetableData.find(item =>
                          item.day.toLowerCase() === day.toLowerCase() && item.time === ts
                        );
                        if (!s) return null;
                        return {
                          time: ts,
                          subject: s.subject,
                          faculty: s.teacher,
                          _subjectId: s._subjectId,
                          type: s.type,
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
                          const schedule = timetableData.find(item =>
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
                              {schedule ? (
                                <div className="student-schedule-item">
                                  {timeLabel && (
                                    <div className="student-teacher" style={{ fontWeight: 600, color: '#0369a1' }}>
                                      {timeLabel}
                                    </div>
                                  )}
                                  <div className="student-subject">{schedule.subject}</div>
                                  <div className="student-teacher">{schedule.teacher}</div>
                                  <div className="student-room">{schedule.room}</div>
                                  <div className={`student-type ${schedule.type.toLowerCase()}`}>
                                    {schedule.type}
                                  </div>
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
            ) : (
              <div className="empty-state">
                <p>No timetable entries found for this batch.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="student-timetable-placeholder">
            <Calendar className="student-placeholder-icon" />
            <h3>No Timetable Found</h3>
            <p>No timetable has been generated for this batch yet.</p>
          </div>
        )
      ) : (
        <div className="student-timetable-placeholder">
          <Calendar className="student-placeholder-icon" />
          <h3>Select a Batch</h3>
          <p>Please select a batch to view its timetable</p>
        </div>
      )}
    </div>
  );
};

export default StudentTimetableViewer;
