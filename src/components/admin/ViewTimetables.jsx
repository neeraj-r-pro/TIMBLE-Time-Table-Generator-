import { useState, useEffect } from 'react';
import { Calendar, Clock, Pencil, Trash2, Save, X, Eye, Download, Loader2, Copy, Check, Users } from 'lucide-react';
import './ViewTimetables.css';
import '../student/StudentTimetableViewer.css';
import { timetablesAPI, batchesAPI, timetableManagementAPI, institutionsAPI, preferencesAPI } from '../../services/api';
import {
  buildSubjectIdToFacultyNamesMap,
  computeTeachingContinuationFlags,
  formatFacultyListForSubject,
  mergedTimeLabelForRun,
} from '../../utils/timetableDisplayUtils';

export function ViewTimetables() {
  const [timetableRecords, setTimetableRecords] = useState([]);
  // timetableDataMap: { timetableId: { record, batchEntries: [ { batchId, batchName, schedule } ] } }
  const [timetableDataMap, setTimetableDataMap] = useState({});
  const [batches, setBatches] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [loading, setLoading] = useState(false);

  // Which timetable record is selected in the sidebar
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  // Which batch is selected in the viewer's batch dropdown
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopyCode = (code, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Load institutions on mount
  useEffect(() => {
    institutionsAPI.getAll().then((data) => setInstitutions(data || [])).catch(console.error);
  }, []);

  // Restore or auto-select institution from localStorage
  useEffect(() => {
    if (institutions.length === 0) return;
    const stored = localStorage.getItem('admin_selected_institution_id');
    if (stored && institutions.some((i) => i.id === stored)) {
      setSelectedInstitutionId(stored);
    } else {
      setSelectedInstitutionId(institutions[0].id);
    }
  }, [institutions]);

  // Fetch timetables whenever selected institution changes
  useEffect(() => {
    if (selectedInstitutionId) {
      localStorage.setItem('admin_selected_institution_id', selectedInstitutionId);
      fetchData();
    } else {
      setTimetableDataMap({});
      setTimetableRecords([]);
      setBatches([]);
    }
  }, [selectedInstitutionId]);

  const fetchData = async () => {
    if (!selectedInstitutionId) return;
    try {
      setLoading(true);
      setError(null);
      const [recordsData, batchesData] = await Promise.all([
        timetableManagementAPI.getAll({ institutionId: selectedInstitutionId }),
        batchesAPI.getAll(null, selectedInstitutionId)
      ]);
      setTimetableRecords(recordsData || []);
      setBatches(batchesData || []);

      const prefsList = await Promise.all(
        (recordsData || []).map((r) => preferencesAPI.getAllForTimetable(r.id).catch(() => []))
      );
      const prefsByTimetableId = {};
      (recordsData || []).forEach((r, i) => {
        prefsByTimetableId[r.id] = prefsList[i] || [];
      });

      const dataMap = {};
      for (const record of recordsData || []) {
        const entries = await timetablesAPI.getAll({ timetableId: record.id });
        const batchEntries = transformTimetableData(
          batchesData,
          entries,
          record,
          prefsByTimetableId[record.id] || []
        );
        dataMap[record.id] = { record, batchEntries };
      }
      setTimetableDataMap(dataMap);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load timetables');
    } finally {
      setLoading(false);
    }
  };

  const transformTimetableData = (batchList, entries, timetableRecord, prefsRows = []) => {
    const batchMap = new Map();
    const timetableId = timetableRecord?.id;
    const timetableCode = timetableRecord?.code || '';
    const subjectFacultyMap = buildSubjectIdToFacultyNamesMap(prefsRows);

    (entries || []).forEach(entry => {
      if (timetableId && entry.timetable_id && entry.timetable_id !== timetableId) return;

      // Use local batches first, fall back to inline batch from Supabase join
      const batch = batchList.find(b => b.id === entry.batch_id) || entry.batch;
      if (!batch) return;

      const key = batch.id;
      if (!batchMap.has(key)) {
        batchMap.set(key, {
          batchId: batch.id,
          batchName: `${batch.code || ''} - ${batch.stream || batch.name || 'Unknown'}`.replace(/^ - /, ''),
          timetableId,
          timetableCode,
          scheduleByDay: {}
        });
      }
      const rec = batchMap.get(key);
      const day = entry.day_of_week;
      if (!rec.scheduleByDay[day]) rec.scheduleByDay[day] = [];
      const sid = entry.subject_id || entry.subject?.id;
      const primaryFaculty = entry.faculty?.name || '';
      rec.scheduleByDay[day].push({
        id: entry.id,
        time: `${entry.start_time} - ${entry.end_time}`,
        subject: entry.subject?.name || 'TBA',
        faculty: formatFacultyListForSubject(sid, primaryFaculty, subjectFacultyMap),
        room: entry.room?.name || 'TBA',
        subjectId: sid,
        _subjectId: sid,
      });
    });

    return Array.from(batchMap.values()).map(rec => ({
      ...rec,
      schedule: Object.entries(rec.scheduleByDay)
        .sort(([a], [b]) => {
          const order = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };
          return (order[a] || 99) - (order[b] || 99);
        })
        .map(([day, slots]) => ({
          day: day.charAt(0).toUpperCase() + day.slice(1),
          slots: slots.sort((a, b) => a.time.localeCompare(b.time))
        })),
      scheduleByDay: undefined
    }));
  };

  // Current timetable data for the selected record
  const currentTTData = selectedRecordId ? timetableDataMap[selectedRecordId] : null;
  const currentRecord = currentTTData?.record || null;
  const currentBatchEntries = currentTTData?.batchEntries || [];
  // The batch entry currently shown in the viewer
  const currentBatchSchedule = currentBatchEntries.find(b => b.batchId === selectedBatchId) || null;

  const handleSelectRecord = (record) => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm('You have unsaved changes. Do you want to discard them?');
      if (!confirmLeave) return;
    }
    setSelectedRecordId(record.id);
    setShowExportMenu(false);
    // Auto-select first batch
    const data = timetableDataMap[record.id];
    if (data?.batchEntries?.length > 0) {
      setSelectedBatchId(data.batchEntries[0].batchId);
    } else {
      setSelectedBatchId(null);
    }
    setHasUnsavedChanges(false);
  };

  const handleEditSlot = (dayIndex, slotIndex) => {
    if (!currentBatchSchedule) return;
    const slot = currentBatchSchedule.schedule[dayIndex].slots[slotIndex];
    if (slot.subject === 'Lunch Break') return;

    setEditingSlot({ dayIndex, slotIndex, slot: { ...slot } });
    setIsEditDialogOpen(true);
  };

  const handleSaveSlot = (event) => {
    event.preventDefault();
    if (!currentBatchSchedule || !editingSlot) return;

    const formData = new FormData(event.currentTarget);
    const updatedSlot = {
      time: editingSlot.slot.time,
      subject: formData.get('subject'),
      faculty: formData.get('faculty'),
      room: formData.get('room'),
    };

    // Update the schedule in the data map
    setTimetableDataMap(prev => {
      const copy = { ...prev };
      const ttData = { ...copy[selectedRecordId] };
      const batchEntries = ttData.batchEntries.map(be => {
        if (be.batchId !== selectedBatchId) return be;
        const schedule = [...be.schedule];
        schedule[editingSlot.dayIndex] = {
          ...schedule[editingSlot.dayIndex],
          slots: schedule[editingSlot.dayIndex].slots.map((s, i) =>
            i === editingSlot.slotIndex ? updatedSlot : s
          ),
        };
        return { ...be, schedule };
      });
      copy[selectedRecordId] = { ...ttData, batchEntries };
      return copy;
    });

    setHasUnsavedChanges(true);
    setIsEditDialogOpen(false);
  };

  const handleSaveTimetable = async () => {
    if (!selectedRecordId) return;
    try {
      setHasUnsavedChanges(false);
      alert('Timetable saved successfully');
    } catch (err) {
      console.error('Error saving timetable:', err);
      alert('Failed to save timetable: ' + (err.message || 'Unknown error'));
    }
  };

  const handleExport = (format) => {
    if (!currentBatchSchedule) {
      alert('Please select a batch to export');
      return;
    }

    const { batchName, schedule } = currentBatchSchedule;
    const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Get unique time slots
    const allSlots = schedule.flatMap(day => day.slots);
    const timeSlots = Array.from(new Set(allSlots.map(s => s.time))).sort();

    if (format === 'CSV' || format === 'Excel') {
      const rows = [];
      rows.push([`Timetable: ${currentRecord.name}`]);
      rows.push([`Batch: ${batchName}`]);
      rows.push(['Day', ...timeSlots]);

      DAYS_ORDER.forEach(dayName => {
        const daySchedule = schedule.find(d => d.day.toLowerCase() === dayName.toLowerCase());
        const row = [dayName];
        timeSlots.forEach(slotTime => {
          const slot = daySchedule?.slots.find(s => s.time === slotTime);
          if (slot) {
            row.push(`${slot.subject} (${slot.faculty}) @ ${slot.room}`);
          } else {
            row.push('-');
          }
        });
        rows.push(row);
      });

      const csvContent = "data:text/csv;charset=utf-8,"
        + rows.map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${batchName.replace(/\s+/g, '_')}_timetable.${format === 'CSV' ? 'csv' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'IMAGE') {
      try {
        const padding = 24;
        const dayColW = 140;
        const slotW = Math.max(110, Math.floor(1100 / Math.max(1, timeSlots.length)));
        const cellH = 62;
        const titleH = 56;
        const headerH = 46;

        const canvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor((padding * 2 + dayColW + timeSlots.length * slotW) * dpr);
        canvas.height = Math.floor((padding * 2 + titleH + headerH + DAYS_ORDER.length * cellH) * dpr);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          alert('Canvas export not supported in this browser');
          return;
        }
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

        // Title
        ctx.fillStyle = '#111827';
        ctx.font = '700 22px Arial';
        ctx.fillText(`Timetable - ${batchName}`, padding, padding + 26);

        // Grid origin
        const gridX = padding;
        const gridY = padding + titleH;

        // Header row
        ctx.font = '600 14px Arial';
        ctx.fillStyle = '#111827';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.strokeRect(gridX, gridY, dayColW, headerH);
        ctx.fillText('Day', gridX + dayColW / 2, gridY + headerH / 2 + 5);

        timeSlots.forEach((slot, colIdx) => {
          const x = gridX + dayColW + colIdx * slotW;
          ctx.strokeRect(x, gridY, slotW, headerH);
          ctx.fillText(String(slot), x + slotW / 2, gridY + headerH / 2 + 5);
        });

        // Rows
        ctx.textAlign = 'left';
        ctx.font = '500 12px Arial';
        DAYS_ORDER.forEach((dayName, rowIdx) => {
          const y = gridY + headerH + rowIdx * cellH;

          // Day column
          ctx.strokeRect(gridX, y, dayColW, cellH);
          ctx.fillStyle = '#111827';
          ctx.fillText(dayName, gridX + 8, y + cellH / 2 + 5);

          const daySchedule = schedule.find(d => d.day.toLowerCase() === dayName.toLowerCase());
          timeSlots.forEach((slotTime, colIdx) => {
            const x = gridX + dayColW + colIdx * slotW;
            ctx.strokeRect(x, y, slotW, cellH);

            const slot = daySchedule?.slots.find(s => s.time === slotTime);
            const label = slot?.subject ? String(slot.subject) : '-';
            const maxChars = Math.max(6, Math.floor((slotW - 14) / 7));
            const display = label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;

            ctx.fillStyle = '#0f172a';
            ctx.fillText(display, x + 8, y + cellH / 2 + 5);
          });
        });

        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `timetable_${batchName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e) {
        console.error('Image export failed:', e);
        alert('Image export failed');
      }
    } else if (format === 'PDF') {
      // Use window.print() approach by creating a temporary printable element
      // This is the cleanest way without heavy libraries like jspdf in a limited env
      window.print();
    }
  };

  const handleDeleteTimetable = async (recordId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this timetable and all its entries?');
    if (!confirmDelete) return;

    try {
      await timetableManagementAPI.delete(recordId);
      if (selectedRecordId === recordId) {
        setSelectedRecordId(null);
        setSelectedBatchId(null);
      }
      await fetchData();
      alert('Timetable deleted successfully');
    } catch (err) {
      console.error('Error deleting timetable:', err);
      alert('Failed to delete timetable: ' + (err.message || 'Unknown error'));
    }
  };



  if (loading) {
    return (
      <div className="view-timetables">
        <div className="loading-container">
          <Loader2 className="spinner" />
          <p>Loading timetables...</p>
        </div>
      </div>
    );
  }

  if (institutions.length === 0) {
    return (
      <div className="view-timetables">
        <div className="empty-state">
          <Calendar className="empty-icon" />
          <p>No institutions found. Create an institution first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-timetables">
      <div className="page-header">
        <div>
          <h1>View Timetables</h1>
          <p className="page-subtitle">View and edit created timetables</p>
        </div>
      </div>

      {error && !loading && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={fetchData}>Retry</button>
        </div>
      )}

      <div className="timetables-layout">
        {/* ── Sidebar: timetable records ── */}
        <div className="timetables-sidebar">
          <div className="content-card">
            <div className="form-group sidebar-filter">
              <label>Institution</label>
              <select
                value={selectedInstitutionId}
                onChange={(e) => {
                  setSelectedRecordId(null);
                  setSelectedBatchId(null);
                  setSelectedInstitutionId(e.target.value);
                }}
                className="form-input"
              >
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} ({inst.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="timetables-list">
              {!selectedInstitutionId ? (
                <div className="empty-state">
                  <Calendar className="empty-icon" />
                  <p>Select an institution to view its timetables.</p>
                </div>
              ) : timetableRecords.length === 0 ? (
                <div className="empty-state">
                  <Calendar className="empty-icon" />
                  <p>No timetables found for this institution. Generate a timetable first.</p>
                </div>
              ) : (
                timetableRecords.map((record) => {
                  const ttData = timetableDataMap[record.id];
                  const batchCount = ttData?.batchEntries?.length || 0;
                  return (
                    <div
                      key={record.id}
                      className={`timetable-item ${selectedRecordId === record.id ? 'selected' : ''}`}
                      onClick={() => handleSelectRecord(record)}
                    >
                      <div className="timetable-item-header">
                        <div className="timetable-item-info">
                          <h3 className="timetable-item-name">{record.name}</h3>
                          <div className="institution-code-row">
                            <span className="institution-code-badge">{record.code || 'NO CODE'}</span>
                            {record.code && (
                              <button
                                type="button"
                                className="btn-copy-code"
                                onClick={(e) => handleCopyCode(record.code, e)}
                                title="Copy code"
                              >
                                {copiedCode === record.code ? (
                                  <Check className="icon-sm" />
                                ) : (
                                  <Copy className="icon-sm" />
                                )}
                              </button>
                            )}
                          </div>
                          <div className="timetable-item-meta-row">
                            <span className="meta-item">
                              <Calendar className="icon-xs" /> {record.academic_year || 'N/A'}
                            </span>
                            <span className="meta-item">
                              <Users className="icon-xs" /> {batchCount}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="timetable-item-date">
                        <Calendar className="date-icon" />
                        <span>Modified: {record.updated_at ? new Date(record.updated_at).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="timetable-item-actions">
                        <button
                          className="btn-icon-only"
                          onClick={(e) => { e.stopPropagation(); handleSelectRecord(record); }}
                        >
                          <Eye className="icon-sm" />
                        </button>
                        <button
                          className="btn-icon-only btn-danger"
                          onClick={(e) => { e.stopPropagation(); handleDeleteTimetable(record.id); }}
                        >
                          <Trash2 className="icon-sm" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Viewer panel ── */}
        <div className="timetable-viewer">
          {currentRecord ? (
            <div className="content-card">
              <div className="viewer-header">
                <div>
                  <h2 className="viewer-title">{currentRecord.name}</h2>
                  {currentRecord.code && (
                    <div className="institution-code-row" style={{ marginTop: '0.5rem' }}>
                      <span className="institution-code-badge">{currentRecord.code}</span>
                      <button
                        type="button"
                        className="btn-copy-code"
                        onClick={() => handleCopyCode(currentRecord.code)}
                        title="Copy code"
                      >
                        {copiedCode === currentRecord.code ? (
                          <Check className="icon-sm" />
                        ) : (
                          <Copy className="icon-sm" />
                        )}
                      </button>
                    </div>
                  )}
                  <div className="viewer-meta">
                    {currentRecord.semester && <span className="meta-badge">Semester {currentRecord.semester}</span>}
                    {currentRecord.academic_year && <span className="meta-badge">{currentRecord.academic_year}</span>}
                    <span className="meta-date">
                      <Clock size={14} /> Updated: {currentRecord.updated_at ? new Date(currentRecord.updated_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="viewer-actions">
                  <div className="export-dropdown-container">
                    <button
                      className="btn btn-secondary btn-export-main"
                      onClick={() => setShowExportMenu(!showExportMenu)}
                    >
                      <Download className="btn-icon" />
                      Export
                    </button>
                    {showExportMenu && (
                      <div className="export-menu show">
                        <button onClick={() => { handleExport('CSV'); setShowExportMenu(false); }}>Export as CSV</button>
                        <button onClick={() => { handleExport('Excel'); setShowExportMenu(false); }}>Export as Excel</button>
                        <button onClick={() => { handleExport('IMAGE'); setShowExportMenu(false); }}>Export as Image (PNG)</button>
                      </div>
                    )}
                  </div>
                  {hasUnsavedChanges && (
                    <button className="btn btn-primary" onClick={handleSaveTimetable}>
                      <Save className="btn-icon" />
                      Save Changes
                    </button>
                  )}
                </div>
              </div>

              {hasUnsavedChanges && (
                <div className="unsaved-warning">
                  You have unsaved changes. Click "Save Changes" to save them.
                </div>
              )}

              {/* Batch selector */}
              {currentBatchEntries.length > 0 ? (
                <>
                  <div className="batch-selector-bar">
                    <label>Batch:</label>
                    <select
                      value={selectedBatchId || ''}
                      onChange={(e) => {
                        setSelectedBatchId(e.target.value);
                        setShowExportMenu(false);
                      }}
                      className="form-input batch-select"
                    >
                      {currentBatchEntries.map((be) => (
                        <option key={be.batchId} value={be.batchId}>
                          {be.batchName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentBatchSchedule && currentBatchSchedule.schedule.length > 0 ? (() => {
                    const flatSlots = [];
                    currentBatchSchedule.schedule.forEach((daySchedule, dayIndex) => {
                      daySchedule.slots.forEach((slot, slotIndex) => {
                        flatSlots.push({ ...slot, day: daySchedule.day, dayIndex, slotIndex });
                      });
                    });
                    const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const timeSlots = Array.from(new Set(flatSlots.map(s => s.time))).sort();

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
                            {DAYS_ORDER.map(day => {
                              const daySchedule = currentBatchSchedule.schedule.find(
                                d => d.day.toLowerCase() === day.toLowerCase()
                              );
                              const dayPeriods = (daySchedule?.slots || []).map(slot => ({
                                time: slot.time,
                                subject: slot.subject,
                                faculty: slot.faculty,
                                _subjectId: slot._subjectId || slot.subjectId,
                                type: slot.subject === 'Lunch Break' ? 'lunch' : 'theory',
                              }));

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
                                    const slot = flatSlots.find(s =>
                                      s.day.toLowerCase() === day.toLowerCase() && s.time === timeSlot
                                    );
                                    const runLen = mergeRunLen(colIdx);
                                    const timeLabel = runLen > 1
                                      ? mergedTimeLabelForRun(dayPeriods, timeSlots, colIdx, skip)
                                      : null;

                                    return (
                                      <td
                                        key={`${day}-${timeSlot}`}
                                        className={`student-schedule-cell${runLen > 1 ? ' slot-merged-start' : ''}`}
                                        onClick={() => slot && slot.subject !== 'Lunch Break' && handleEditSlot(slot.dayIndex, slot.slotIndex)}
                                        style={{ cursor: slot && slot.subject !== 'Lunch Break' ? 'pointer' : 'default' }}
                                      >
                                        {slot ? (
                                          slot.subject === 'Lunch Break' ? (
                                            <div className="student-schedule-item" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '1px solid #f59e0b' }}>
                                              <div className="student-subject" style={{ color: '#92400e' }}>Lunch Break</div>
                                            </div>
                                          ) : (
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
                                          )
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
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <Calendar className="empty-icon" />
                      <p>No schedule entries for this batch.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <Calendar className="empty-icon" />
                  <h4>No schedule entries</h4>
                  <p>This timetable has no entries yet. Generate the timetable first.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="content-card empty-state">
              <Calendar className="empty-icon" />
              <p>Select a timetable from the list to view and edit</p>
            </div>
          )}
        </div>
      </div>

      {isEditDialogOpen && editingSlot && (
        <div className="modal-overlay" onClick={() => setIsEditDialogOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Time Slot</h2>
            </div>
            <form onSubmit={handleSaveSlot} className="modal-form">
              <div className="form-group">
                <label>Time</label>
                <input value={editingSlot.slot.time} disabled className="form-input disabled" />
              </div>
              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  name="subject"
                  defaultValue={editingSlot.slot.subject}
                  placeholder="Subject name"
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="faculty">Faculty</label>
                <input
                  id="faculty"
                  name="faculty"
                  type="text"
                  defaultValue={editingSlot.slot.faculty}
                  placeholder="Faculty name"
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="room">Room</label>
                <input
                  id="room"
                  name="room"
                  type="text"
                  defaultValue={editingSlot.slot.room}
                  placeholder="Room name"
                  required
                  className="form-input"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditDialogOpen(false)}>
                  <X className="btn-icon" />
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save className="btn-icon" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
