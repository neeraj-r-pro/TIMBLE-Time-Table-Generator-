import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Save,
  Calendar,
  Copy,
  Users,
  X
} from 'lucide-react';
import './TimetableSteps.css';
import { batchesAPI } from '../../../services/api';

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' }
];

const PERIOD_TYPES = [
  { value: 'class', label: 'Class Period', color: '#3b82f6' },
  { value: 'break', label: 'Short Break', color: '#10b981' },
  { value: 'lunch', label: 'Lunch Break', color: '#f59e0b' },
  { value: 'assembly', label: 'Assembly', color: '#8b5cf6' }
];

const emptyDayMap = () => ({
  monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: []
});

const defaultBreak = () => ({
  shortBreakDuration: 15,
  lunchBreakDuration: 60,
  shortBreakAfterPeriods: 2,
  lunchBreakTime: '13:00',
  allowFlexibleBreaks: false,
  assemblyDay: 'monday',
  assemblyTime: '08:00',
  assemblyDuration: 30
});

const createNewSchedule = (name) => ({
  id: `sch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name,
  batchIds: [],
  days: emptyDayMap(),
  breakSettings: defaultBreak()
});

export function ScheduleTiming({ data, onComplete, onNext, onPrevious, isFirstStep }) {
  const institutionId = data.basicInfo?.institutionId;
  const [batches, setBatches] = useState([]);

  // Multiple schedules — migrate from old format
  const [scheduleList, setScheduleList] = useState(() => {
    const saved = data.scheduleList;
    if (Array.isArray(saved) && saved.length > 0) return saved;

    // migrate old format: single schedule → one entry
    const oldSchedule = data.schedule || data.schedules;
    if (oldSchedule && Object.keys(oldSchedule).length > 0) {
      return [{
        ...createNewSchedule('Default Schedule'),
        days: oldSchedule,
        breakSettings: data.breakSettings || defaultBreak()
      }];
    }
    return [createNewSchedule('Schedule 1')];
  });

  const [activeSchIdx, setActiveSchIdx] = useState(0);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [isAddingPeriod, setIsAddingPeriod] = useState(false);
  const [periodForm, setPeriodForm] = useState({ name: '', startTime: '', endTime: '', type: 'class' });
  const [errors, setErrors] = useState({});
  const [showBreakSettings, setShowBreakSettings] = useState(false);
  const [isNamingSchedule, setIsNamingSchedule] = useState(false);
  const [newSchName, setNewSchName] = useState('');

  // Load batches
  useEffect(() => {
    if (!institutionId) return;
    batchesAPI.getAll(null, institutionId)
      .then(b => setBatches(b || []))
      .catch(console.error);
  }, [institutionId]);

  const activeSch = scheduleList[activeSchIdx] || scheduleList[0];

  // — Schedule CRUD —
  const addSchedule = () => {
    if (!newSchName.trim()) return;
    const sch = createNewSchedule(newSchName.trim());
    setScheduleList(prev => [...prev, sch]);
    setActiveSchIdx(scheduleList.length);
    setIsNamingSchedule(false);
    setNewSchName('');
  };

  const removeSchedule = (idx) => {
    if (scheduleList.length <= 1) return;
    setScheduleList(prev => prev.filter((_, i) => i !== idx));
    if (activeSchIdx >= idx && activeSchIdx > 0) setActiveSchIdx(activeSchIdx - 1);
  };

  const updateActiveSch = (updater) => {
    setScheduleList(prev => prev.map((s, i) => i === activeSchIdx ? updater(s) : s));
  };

  // — Batch assignment —
  const toggleBatch = (batchId) => {
    // Remove from every other schedule first, then toggle on active
    setScheduleList(prev => prev.map((s, i) => {
      if (i === activeSchIdx) {
        const has = s.batchIds.includes(batchId);
        return { ...s, batchIds: has ? s.batchIds.filter(id => id !== batchId) : [...s.batchIds, batchId] };
      }
      // Remove from other schedules (a batch belongs to only one schedule)
      return { ...s, batchIds: s.batchIds.filter(id => id !== batchId) };
    }));
  };

  const assignedBatchIds = new Set(scheduleList.flatMap(s => s.batchIds));
  const unassignedBatches = batches.filter(b => !assignedBatchIds.has(b.id));

  // — Period CRUD —
  const resetForm = () => { setPeriodForm({ name: '', startTime: '', endTime: '', type: 'class' }); setErrors({}); };

  const handleInputChange = (field, value) => {
    setPeriodForm(prev => ({ ...prev, [field]: value }));
    if (field === 'startTime' && periodForm.type === 'class' && value) {
      const num = (activeSch.days[selectedDay] || []).filter(p => p.type === 'class').length + 1;
      setPeriodForm(prev => ({ ...prev, name: `Period ${num}` }));
    }
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    const errs = {};
    if (!periodForm.name.trim()) errs.name = 'Period name is required';
    if (!periodForm.startTime) errs.startTime = 'Start time is required';
    if (!periodForm.endTime) errs.endTime = 'End time is required';
    if (periodForm.startTime && periodForm.endTime) {
      if (periodForm.startTime >= periodForm.endTime) errs.endTime = 'End time must be after start time';
      const conflict = (activeSch.days[selectedDay] || []).some(p =>
        periodForm.startTime < p.endTime && periodForm.endTime > p.startTime
      );
      if (conflict) errs.startTime = 'Time conflicts with existing period';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddPeriod = () => {
    if (!validateForm()) return;
    const newPeriod = { id: Date.now().toString(), ...periodForm };
    updateActiveSch(s => ({
      ...s,
      days: {
        ...s.days,
        [selectedDay]: [...(s.days[selectedDay] || []), newPeriod].sort((a, b) => a.startTime.localeCompare(b.startTime))
      }
    }));
    resetForm();
    setIsAddingPeriod(false);
  };

  const handleDeletePeriod = (periodId) => {
    updateActiveSch(s => ({
      ...s,
      days: { ...s.days, [selectedDay]: s.days[selectedDay].filter(p => p.id !== periodId) }
    }));
  };

  const handleCopyDay = (fromDay) => {
    updateActiveSch(s => ({ ...s, days: { ...s.days, [selectedDay]: [...s.days[fromDay]] } }));
  };

  const handleBreakChange = (field, value) => {
    updateActiveSch(s => ({ ...s, breakSettings: { ...s.breakSettings, [field]: value } }));
  };

  // — Save —
  const handleSave = () => {
    const hasAny = scheduleList.some(s => Object.values(s.days).some(d => d.length > 0));
    if (!hasAny) {
      alert('Please add at least one period to any schedule before continuing.');
      return;
    }
    // For backward compat: also emit first schedule as the default `schedules` / `breakSettings`
    const first = scheduleList[0];
    onComplete({
      schedules: first.days,
      breakSettings: first.breakSettings,
      scheduleList // full multi-schedule data
    });
  };

  const getTypeColor = (type) => PERIOD_TYPES.find(pt => pt.value === type)?.color || '#6b7280';
  const totalClassPeriods = Object.values(activeSch.days).reduce((t, d) => t + d.filter(p => p.type === 'class').length, 0);

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  return (
    <div className="timetable-step">
      <div className="step-header">
        <div className="step-icon-wrapper"><Clock className="step-main-icon" /></div>
        <div className="step-title-section">
          <h2>Schedule Timing</h2>
          <p>Define schedules and assign batches — different batches can have different timings</p>
        </div>
      </div>

      <div className="schedule-timing-content">
        {/* ── Schedule Tabs ── */}
        <div className="multi-schedule-tabs-section">
          <div className="section-header">
            <h3>Schedules</h3>
            {!isNamingSchedule ? (
              <button className="btn btn-primary btn-sm" onClick={() => setIsNamingSchedule(true)}>
                <Plus className="btn-icon" /> New Schedule
              </button>
            ) : (
              <div className="inline-name-form">
                <input
                  className="form-input"
                  placeholder="Schedule name…"
                  value={newSchName}
                  onChange={(e) => setNewSchName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSchedule()}
                  autoFocus
                />
                <button className="btn btn-primary btn-sm" onClick={addSchedule} disabled={!newSchName.trim()}>Add</button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setIsNamingSchedule(false); setNewSchName(''); }}>
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="schedule-tab-strip">
            {scheduleList.map((sch, idx) => (
              <button
                key={sch.id}
                className={`schedule-tab ${activeSchIdx === idx ? 'active' : ''}`}
                onClick={() => { setActiveSchIdx(idx); setIsAddingPeriod(false); }}
              >
                <span className="schedule-tab-name">{sch.name}</span>
                <span className="schedule-tab-meta">{sch.batchIds.length} batch{sch.batchIds.length !== 1 ? 'es' : ''}</span>
                {scheduleList.length > 1 && (
                  <button
                    className="schedule-tab-delete"
                    onClick={(e) => { e.stopPropagation(); removeSchedule(idx); }}
                    title="Delete schedule"
                  >
                    <X size={12} />
                  </button>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Batch assignment ── */}
        <div className="batch-assign-section">
          <div className="section-header">
            <h3>Assign Batches to "{activeSch.name}"</h3>
          </div>
          {batches.length === 0 ? (
            <p className="form-hint">No batches found — add batches first.</p>
          ) : (
            <div className="batch-chip-list">
              {batches.map(b => {
                const selected = activeSch.batchIds.includes(b.id);
                const inOther = !selected && scheduleList.some((s, i) => i !== activeSchIdx && s.batchIds.includes(b.id));
                return (
                  <button
                    key={b.id}
                    className={`batch-chip ${selected ? 'selected' : ''} ${inOther ? 'dimmed' : ''}`}
                    onClick={() => toggleBatch(b.id)}
                    title={inOther ? `Assigned to another schedule — click to move here` : ''}
                  >
                    <Users size={12} />
                    <span>{b.name}</span>
                    {b.code && <span className="batch-chip-code">{b.code}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {unassignedBatches.length > 0 && (
            <p className="form-hint" style={{ marginTop: '0.5rem' }}>
              {unassignedBatches.length} batch{unassignedBatches.length !== 1 ? 'es' : ''} unassigned — they will use the first schedule by default.
            </p>
          )}
        </div>

        {/* Summary Stats */}
        <div className="schedule-stats">
          <div className="stat-card">
            <Calendar className="stat-icon" />
            <div>
              <h4>Class Periods ({activeSch.name})</h4>
              <span className="stat-value">{totalClassPeriods}</span>
            </div>
          </div>
        </div>

        {/* Break Settings */}
        <div className="break-settings-section">
          <div className="section-header">
            <h3>Break Configuration</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowBreakSettings(!showBreakSettings)}>
              {showBreakSettings ? 'Hide' : 'Show'} Settings
            </button>
          </div>
          {showBreakSettings && (
            <div className="break-settings-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Short Break Duration (min)</label>
                  <input type="number" className="form-input" min="5" max="30"
                    value={activeSch.breakSettings.shortBreakDuration}
                    onChange={e => handleBreakChange('shortBreakDuration', parseInt(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Lunch Break Duration (min)</label>
                  <input type="number" className="form-input" min="30" max="120"
                    value={activeSch.breakSettings.lunchBreakDuration}
                    onChange={e => handleBreakChange('lunchBreakDuration', parseInt(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Short Break After (periods)</label>
                  <input type="number" className="form-input" min="1" max="5"
                    value={activeSch.breakSettings.shortBreakAfterPeriods}
                    onChange={e => handleBreakChange('shortBreakAfterPeriods', parseInt(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Lunch Break Time</label>
                  <input type="time" className="form-input"
                    value={activeSch.breakSettings.lunchBreakTime}
                    onChange={e => handleBreakChange('lunchBreakTime', e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Day Tabs */}
        <div className="day-tabs-section">
          <div className="section-header"><h3>Select Day</h3></div>
          <div className="day-tabs">
            {DAYS.map(day => (
              <button
                key={day.key}
                className={`day-tab ${selectedDay === day.key ? 'active' : ''}`}
                onClick={() => setSelectedDay(day.key)}
              >
                <div className="day-tab-info">
                  <span className="day-name">{day.label}</span>
                  <span className="period-count">{(activeSch.days[day.key] || []).length} periods</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Current Day Schedule */}
        <div className="current-day-schedule">
          <div className="section-header">
            <h3>{DAYS.find(d => d.key === selectedDay)?.label} Schedule</h3>
            <div className="schedule-actions">
              <select className="copy-select" onChange={(e) => { if (e.target.value) { handleCopyDay(e.target.value); e.target.value = ''; } }}>
                <option value="">Copy from…</option>
                {DAYS.filter(d => d.key !== selectedDay && (activeSch.days[d.key] || []).length > 0)
                  .map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" onClick={() => setIsAddingPeriod(true)} disabled={isAddingPeriod}>
                <Plus className="btn-icon" /> Add Period
              </button>
            </div>
          </div>

          {(activeSch.days[selectedDay] || []).length === 0 ? (
            <div className="empty-state">
              <Clock className="empty-icon" />
              <h4>No Periods Added</h4>
              <p>Start by adding periods for {DAYS.find(d => d.key === selectedDay)?.label}</p>
            </div>
          ) : (
            <div className="periods-timeline">
              {activeSch.days[selectedDay].map((period) => (
                <div key={period.id} className="period-item" style={{ borderLeftColor: getTypeColor(period.type) }}>
                  <div className="period-header">
                    <div className="period-info">
                      <h4>{period.name}</h4>
                      <span className="period-type" style={{ backgroundColor: getTypeColor(period.type) }}>
                        {PERIOD_TYPES.find(pt => pt.value === period.type)?.label}
                      </span>
                    </div>
                    <div className="period-actions">
                      <span className="period-time">{formatTime(period.startTime)} - {formatTime(period.endTime)}</span>
                      <button className="btn-icon-only btn-delete" onClick={() => handleDeletePeriod(period.id)} title="Delete period">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Period Form */}
          {isAddingPeriod && (
            <div className="period-form-section">
              <div className="section-header"><h3>Add New Period</h3></div>
              <div className="period-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Period Name *</label>
                    <input type="text" className={`form-input ${errors.name ? 'error' : ''}`}
                      placeholder="e.g., Period 1" value={periodForm.name}
                      onChange={e => handleInputChange('name', e.target.value)} />
                    {errors.name && <span className="error-text">{errors.name}</span>}
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select className="form-input" value={periodForm.type} onChange={e => handleInputChange('type', e.target.value)}>
                      {PERIOD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Start Time *</label>
                    <input type="time" className={`form-input ${errors.startTime ? 'error' : ''}`}
                      value={periodForm.startTime} onChange={e => handleInputChange('startTime', e.target.value)} />
                    {errors.startTime && <span className="error-text">{errors.startTime}</span>}
                  </div>
                  <div className="form-group">
                    <label>End Time *</label>
                    <input type="time" className={`form-input ${errors.endTime ? 'error' : ''}`}
                      value={periodForm.endTime} onChange={e => handleInputChange('endTime', e.target.value)} />
                    {errors.endTime && <span className="error-text">{errors.endTime}</span>}
                  </div>
                </div>
                <div className="form-actions">
                  <button className="btn btn-secondary" onClick={() => { resetForm(); setIsAddingPeriod(false); }}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleAddPeriod}>
                    <Save className="btn-icon" /> Add Period
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="step-actions">
        {!isFirstStep && (
          <button className="btn btn-secondary" onClick={onPrevious}>
            <ArrowLeft className="btn-icon-left" /> Previous
          </button>
        )}
        <button className="btn btn-primary" onClick={handleSave}>
          Save &amp; Continue
          <ArrowRight className="btn-icon-right" />
        </button>
      </div>
    </div>
  );
}