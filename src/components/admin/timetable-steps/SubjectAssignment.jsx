import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Clock,
  Trash2,
  Copy,
  Link2,
  Merge,
  Settings,
  X,
  ChevronDown,
  ChevronUp,
  DoorOpen,
  Save,
  Loader2,
  Check,
  EyeOff,
  Eye,
  Pencil,
  Unlink
} from 'lucide-react';
import './TimetableSteps.css';
import { subjectsAPI, roomsAPI, batchesAPI } from '../../../services/api';

/**
 * Session Allocation — redesigned
 * 1. Select batch → subjects are auto-loaded as session cards
 * 2. Duplicate / Merge sessions
 * 3. Configure frequency + rooms (optional, multi-select)
 * 4. Faculty comes from preferences (not set here)
 */
export function SubjectAssignment({ data, onComplete, onPrevious, isFirstStep }) {
  const institutionId = data.basicInfo?.institutionId;

  const [batches, setBatches] = useState([]);
  const [existingSubjects, setExistingSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [sessions, setSessions] = useState(data.subjects || {}); // { batchId: [session, ...] }
  const [selectedBatch, setSelectedBatch] = useState('');
  const [expandedSection, setExpandedSection] = useState(null); // 'freq' or 'rooms' or 'link'
  const [expandedSession, setExpandedSession] = useState(null);
  const [mergeSource, setMergeSource] = useState(null); // session id being merged
  const [editingName, setEditingName] = useState(null); // session id whose name is being edited
  const [editNameValue, setEditNameValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!institutionId) return;
    (async () => {
      try {
        const [b, r, s] = await Promise.all([
          batchesAPI.getAll(null, institutionId),
          roomsAPI.getAll(institutionId),
          subjectsAPI.getAll(null, institutionId),
        ]);
        setBatches(b || []);
        setRooms(r || []);
        setExistingSubjects(s || []);
        if (b?.length > 0 && !selectedBatch) setSelectedBatch(b[0].id);
      } catch (err) {
        console.error('Error loading session data:', err);
      }
    })();
  }, [institutionId]);

  // Auto-populate sessions for all batches when data is loaded
  useEffect(() => {
    if (batches.length === 0 || existingSubjects.length === 0) return;

    setSessions(prevSessions => {
      const newSessionsState = { ...prevSessions };
      let changed = false;

      batches.forEach(batch => {
        const batchSubjects = existingSubjects.filter(s => s.batch_id === batch.id);

        if (!newSessionsState[batch.id]) {
          newSessionsState[batch.id] = [];
          changed = true;
        }

        let currentSessionsList = [...newSessionsState[batch.id]];
        let listChanged = false;

        if (batchSubjects.length > 0) {
          // Sync existing original sessions with DB changes
          currentSessionsList = currentSessionsList.map(session => {
            if (session.isOriginal && !session.isDuplicate && session.subjectIds?.length === 1 && !session.mergedFrom) {
              const dbSub = batchSubjects.find(s => s.id === session.subjectIds[0]);
              if (dbSub) {
                const fallbackConfig = [{
                  count: dbSub.periods_per_week || 1,
                  length: dbSub.consecutive_periods || 1
                }];
                const pPw = dbSub.periods_per_week || dbSub.periodsPerWeek || (dbSub.type === 'lab' || dbSub.type === 'practical' ? 2 : 1);
                const newFreq = dbSub.frequency_config && dbSub.frequency_config.length > 0 ? dbSub.frequency_config : fallbackConfig;

                // Detect if config, name, or type changed from what's in DB
                if (
                  session.name !== dbSub.name || 
                  session.periodsPerWeek !== pPw || 
                  JSON.stringify(session.frequencyConfig) !== JSON.stringify(newFreq)
                ) {
                  listChanged = true;
                  return {
                    ...session,
                    name: dbSub.name,
                    code: dbSub.code,
                    type: dbSub.type || 'theory',
                    frequencyConfig: newFreq,
                    periodsPerWeek: pPw
                  };
                }
              }
            }
            return session;
          });

          // Add any NEW subjects from the DB that aren't in currentSessionsList at all
          batchSubjects.forEach(sub => {
            const exists = currentSessionsList.some(s => s.subjectIds?.includes(sub.id));
            if (!exists) {
              listChanged = true;
              const fallbackConfig = [{
                count: sub.periods_per_week || 1,
                length: sub.consecutive_periods || 1
              }];
              const pPw = sub.periods_per_week || sub.periodsPerWeek || (sub.type === 'lab' || sub.type === 'practical' ? 2 : 1);

              currentSessionsList.push({
                id: `sess-${Date.now()}-${sub.id}-${Math.random().toString(36).slice(2, 7)}`,
                subjectIds: [sub.id],
                name: sub.name,
                code: sub.code,
                type: sub.type || 'theory',
                isDuplicate: false,
                isOriginal: true,
                disabled: false,
                sourceId: null,
                mergedFrom: null,
                roomIds: [],
                frequencyConfig: sub.frequency_config && sub.frequency_config.length > 0 ? sub.frequency_config : fallbackConfig,
                periodsPerWeek: pPw,
              });
            }
          });
        }

        if (listChanged) {
          newSessionsState[batch.id] = currentSessionsList;
          changed = true;
        }
      });

      return changed ? newSessionsState : prevSessions;
    });

  }, [batches, existingSubjects, institutionId]);

  // Sync to parent whenever sessions change
  useEffect(() => {
    if (Object.keys(sessions).length > 0 && typeof onDataUpdate === 'function') {
      onDataUpdate({ subjects: sessions, batches });
    }
  }, [sessions, batches]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const currentSessions = sessions[selectedBatch] || [];
  const getSubject = (id) => existingSubjects.find(s => s.id === id);
  const totalPeriods = (cfg) =>
    cfg.reduce((s, c) => s + (c.count > 0 && c.length > 0 ? c.count * c.length : 0), 0);
  const freqSummary = (cfg) => {
    const parts = cfg.filter(c => c.count > 0 && c.length > 0).map(c => `${c.count}×${c.length}`);
    return parts.length ? `${parts.join(' + ')} = ${totalPeriods(cfg)} periods/week` : '—';
  };
  const areSessionsSimilar = (s1, s2) => {
    if (!s1 || !s2) return false;

    // Get all codes for session 1
    const codes1 = (s1.subjectIds || []).map(id => getSubject(id)?.code).filter(Boolean);
    // Get all codes for session 2
    const codes2 = (s2.subjectIds || []).map(id => getSubject(id)?.code).filter(Boolean);

    if (codes1.length !== codes2.length || codes1.length === 0) return false;

    const set1 = new Set(codes1);
    return codes2.every(code => set1.has(code));
  };
  // ── Duplicate ─────────────────────────────────────────────────────────────
  const handleDuplicate = (session) => {
    const newSession = {
      ...session,
      id: `sess-dup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      isDuplicate: true,
      isOriginal: false,
      disabled: false,
      sourceId: session.subjectIds[0],
      mergedFrom: null,
      name: `${session.name} (Copy)`,
    };
    setSessions(prev => ({
      ...prev,
      [selectedBatch]: [...(prev[selectedBatch] || []), newSession],
    }));
  };

  // ── Merge ─────────────────────────────────────────────────────────────────
  const startMerge = (sessionId) => {
    setMergeSource(sessionId);
  };

  const cancelMerge = () => {
    setMergeSource(null);
  };

  const completeMerge = (targetId) => {
    if (!mergeSource || mergeSource === targetId) return;

    setSessions(prev => {
      const list = prev[selectedBatch] || [];
      const source = list.find(s => s.id === mergeSource);
      const target = list.find(s => s.id === targetId);
      if (!source || !target) return prev;

      // Store snapshots so we can un-merge later
      const sourceSnapshot = { ...source };
      const targetSnapshot = { ...target, mergedFrom: target.mergedFrom };

      const merged = {
        ...target,
        subjectIds: [...new Set([...target.subjectIds, ...source.subjectIds])],
        name: `${target.name} / ${source.name}`,
        code: `${target.code} / ${source.code}`,
        mergedFrom: [...(target.mergedFrom || [targetSnapshot]), sourceSnapshot],
      };

      return {
        ...prev,
        [selectedBatch]: list.filter(s => s.id !== mergeSource).map(s => s.id === targetId ? merged : s),
      };
    });
    setMergeSource(null);
  };

  // ── Un-merge ──────────────────────────────────────────────────────────────
  const handleUnmerge = (sessionId) => {
    setSessions(prev => {
      const list = prev[selectedBatch] || [];
      const session = list.find(s => s.id === sessionId);
      if (!session?.mergedFrom || session.mergedFrom.length === 0) return prev;

      // Restore all the original snapshots, keeping their own mergedFrom intact
      const restored = session.mergedFrom.map(snap => ({
        ...snap,
        // Keep the snapshot's own mergedFrom (could be a nested merge)
      }));

      return {
        ...prev,
        [selectedBatch]: [...list.filter(s => s.id !== sessionId), ...restored],
      };
    });
    if (expandedSession === sessionId) setExpandedSession(null);
  };

  // ── Delete (only for duplicates/non-originals) ────────────────────────────
  const handleDelete = (sessionId) => {
    setSessions(prev => ({
      ...prev,
      [selectedBatch]: (prev[selectedBatch] || []).filter(s => s.id !== sessionId),
    }));
    if (expandedSession === sessionId) setExpandedSession(null);
  };

  // ── Disable/Enable toggle (for originals) ─────────────────────────────────
  const toggleDisable = (sessionId) => {
    setSessions(prev => ({
      ...prev,
      [selectedBatch]: (prev[selectedBatch] || []).map(s =>
        s.id === sessionId ? { ...s, disabled: !s.disabled } : s
      ),
    }));
  };

  // ── Rename (for duplicates) ───────────────────────────────────────────────
  const startRename = (session) => {
    setEditingName(session.id);
    setEditNameValue(session.name);
  };

  const saveRename = (sessionId) => {
    setSessions(prev => ({
      ...prev,
      [selectedBatch]: (prev[selectedBatch] || []).map(s =>
        s.id === sessionId ? { ...s, name: editNameValue || s.name } : s
      ),
    }));
    setEditingName(null);
    setEditNameValue('');
  };

  const cancelRename = () => {
    setEditingName(null);
    setEditNameValue('');
  };

  // ── Configuration ─────────────────────────────────────────────────────────
  const updateFreq = (sessionId, i, key, raw) => {
    const val = parseInt(raw || '0', 10);
    setSessions(prev => ({
      ...prev,
      [selectedBatch]: (prev[selectedBatch] || []).map(s => {
        if (s.id !== sessionId) return s;
        const fc = s.frequencyConfig.map((c, idx) =>
          idx === i ? { ...c, [key]: isNaN(val) ? 0 : val } : c
        );
        return { ...s, frequencyConfig: fc, periodsPerWeek: totalPeriods(fc) };
      }),
    }));
  };

  const addFreqRow = (sessionId) => {
    setSessions(prev => ({
      ...prev,
      [selectedBatch]: (prev[selectedBatch] || []).map(s => {
        if (s.id !== sessionId) return s;
        const fc = [...s.frequencyConfig, { count: 1, length: 1 }];
        return { ...s, frequencyConfig: fc, periodsPerWeek: totalPeriods(fc) };
      }),
    }));
  };

  const removeFreqRow = (sessionId, i) => {
    setSessions(prev => ({
      ...prev,
      [selectedBatch]: (prev[selectedBatch] || []).map(s => {
        if (s.id !== sessionId) return s;
        const fc = s.frequencyConfig.filter((_, idx) => idx !== i);
        const final = fc.length ? fc : [{ count: 1, length: 1 }];
        return { ...s, frequencyConfig: final, periodsPerWeek: totalPeriods(final) };
      }),
    }));
  };

  // ── Room toggle (multi-select) ────────────────────────────────────────────
  const toggleRoom = (sessionId, roomId) => {
    setSessions(prev => ({
      ...prev,
      [selectedBatch]: (prev[selectedBatch] || []).map(s => {
        if (s.id !== sessionId) return s;
        const ids = s.roomIds || [];
        const next = ids.includes(roomId) ? ids.filter(r => r !== roomId) : [...ids, roomId];
        return { ...s, roomIds: next };
      }),
    }));
  };

  // ── Link Batches toggle (combined session) ─────────────────────────────────
  const toggleLinkedBatch = (sessionId, batchId) => {
    setSessions(prev => {
      const currentBatchList = prev[selectedBatch] || [];
      const session = currentBatchList.find(s => s.id === sessionId);
      if (!session) return prev;

      const targetBatchList = prev[batchId] || [];
      // Use the new helper for ID-set based similarity check
      const matchingTarget = targetBatchList.find(s => areSessionsSimilar(s, session));

      // If linking, we need a matching session in the target batch
      const isLinking = !(session.linkedBatchIds || []).includes(batchId);
      if (isLinking && !matchingTarget) return prev;

      const groupId = session.combinedGroupId || `combined-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // Update current session
      const updatedCurrentList = currentBatchList.map(s => {
        if (s.id !== sessionId) return s;
        const ids = s.linkedBatchIds || [];
        const next = ids.includes(batchId) ? ids.filter(b => b !== batchId) : [...ids, batchId];
        return { ...s, linkedBatchIds: next, combinedGroupId: next.length > 0 ? groupId : null };
      });

      // Update target session in the other batch
      const updatedTargetList = targetBatchList.map(s => {
        if (!areSessionsSimilar(s, session)) return s;
        const ids = s.linkedBatchIds || [];
        const next = isLinking
          ? [...new Set([...ids, selectedBatch])]
          : ids.filter(b => b !== selectedBatch);
        return { ...s, linkedBatchIds: next, combinedGroupId: next.length > 0 ? groupId : null };
      });

      return {
        ...prev,
        [selectedBatch]: updatedCurrentList,
        [batchId]: updatedTargetList
      };
    });
  };

  const getLinkedBatchNames = (session) => {
    if (!session.linkedBatchIds || session.linkedBatchIds.length === 0) return null;
    return session.linkedBatchIds.map(id => batches.find(b => b.id === id)?.name || id).join(', ');
  };

  // ── Save & Continue (exclude disabled, replicate combined, PERSIST TO DB) ────────────────
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const activeSessions = {};
      for (const [batchId, list] of Object.entries(sessions)) {
        activeSessions[batchId] = list.filter(s => !s.disabled);
      }

      // 1. Replicate combined sessions to all linked batches
      for (const [batchId, list] of Object.entries(activeSessions)) {
        list.forEach(session => {
          if (session.linkedBatchIds && session.linkedBatchIds.length > 0 && session.combinedGroupId) {
            for (const linkedId of session.linkedBatchIds) {
              if (!activeSessions[linkedId]) activeSessions[linkedId] = [];
              const existingInTarget = activeSessions[linkedId].find(s => s.code === session.code || s.combinedGroupId === session.combinedGroupId);

              if (!existingInTarget) {
                activeSessions[linkedId].push({
                  ...session,
                  id: `combined-mirror-${session.combinedGroupId}-${linkedId}`,
                  linkedBatchIds: [...new Set([batchId, ...session.linkedBatchIds])],
                });
              } else if (existingInTarget.combinedGroupId !== session.combinedGroupId) {
                existingInTarget.combinedGroupId = session.combinedGroupId;
                existingInTarget.linkedBatchIds = [...new Set([...(existingInTarget.linkedBatchIds || []), batchId])];
              }
            }
          }
        });
      }

      if (!Object.values(activeSessions).some(arr => arr.length > 0)) {
        alert('Please have at least one active session before continuing.');
        setIsSaving(false);
        return;
      }

      // 2. Persist ORIGINAL sessions to Database
      // Find all original sessions across all batches and update the subjects table
      const originalToUpdate = [];
      Object.values(sessions).forEach(batchList => {
        batchList.forEach(session => {
          if (session.isOriginal && !session.isDuplicate && session.subjectIds?.length === 1) {
            originalToUpdate.push(session);
          }
        });
      });

      if (originalToUpdate.length > 0) {
        await Promise.all(originalToUpdate.map(session => 
          subjectsAPI.update(session.subjectIds[0], {
            frequencyConfig: session.frequencyConfig,
            periodsPerWeek: session.periodsPerWeek
          })
        ));
      }

      if (typeof onComplete === 'function') onComplete({ subjects: activeSessions, batches });
    } catch (err) {
      console.error('Error during persistence:', err);
      // More specific error message
      const details = err.message || 'Check your database connection';
      alert(`Failed to save configurations: ${details}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getTotalSessions = () => Object.values(sessions).reduce((t, a) => t + a.length, 0);

  // Period occupancy
  const getBatchScheduleStats = () => {
    if (!selectedBatch) return { assigned: 0, total: 0 };
    const scheduleList = data.scheduleList || [];
    let schedule = scheduleList.find(s => s.batchIds?.includes(selectedBatch));
    if (!schedule && scheduleList.length > 0) schedule = scheduleList[0];
    if (!schedule) return { assigned: 0, total: 0 };
    const total = Object.values(schedule.days || {}).reduce((t, d) => t + d.filter(p => p.type === 'class').length, 0);
    const assigned = currentSessions.reduce((t, a) => t + (a.periodsPerWeek || 0), 0);
    return { assigned, total };
  };
  const { assigned: assignedPeriods, total: allowedPeriods } = React.useMemo(() => getBatchScheduleStats(), [selectedBatch, currentSessions, data.scheduleList]);
  const occupancyPct = React.useMemo(() => allowedPeriods > 0 ? Math.min(100, (assignedPeriods / allowedPeriods) * 100) : 0, [assignedPeriods, allowedPeriods]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!institutionId)
    return <div className="timetable-step"><div className="step-header"><BookOpen className="step-main-icon" /><div className="step-title-section"><h2>Session Allocation</h2><p>Complete Basic Information first.</p></div></div></div>;

  if (batches.length === 0)
    return <div className="timetable-step"><div className="step-header"><BookOpen className="step-main-icon" /><div className="step-title-section"><h2>Session Allocation</h2><p>No batches found. Add batches under Institution → Batches first.</p></div></div></div>;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="timetable-step">
      <div className="step-header">
        <div className="step-icon-wrapper"><BookOpen className="step-main-icon" /></div>
        <div className="step-title-section">
          <h2>Session Allocation</h2>
          <p>Subjects are auto-loaded per batch. Duplicate, merge, and configure sessions.</p>
        </div>
      </div>

      <div className="subject-assignment-content">
        {/* Batch Tabs */}
        <div className="batch-selection-section">
          <div className="section-header">
            <h3>Select Batch</h3>
            <div className="batch-stats">Total Sessions: {getTotalSessions()}</div>
          </div>
          <div className="batch-tabs">
            {batches.map(batch => (
              <button
                key={batch.id}
                className={`batch-tab ${selectedBatch === batch.id ? 'active' : ''}`}
                onClick={() => { setSelectedBatch(batch.id); setExpandedSession(null); setMergeSource(null); }}
              >
                <div className="batch-tab-info">
                  <span className="batch-tab-name">{batch.name}</span>
                  <span className="batch-tab-code">{batch.code}</span>
                </div>
                <span className="batch-subject-count">{(sessions[batch.id] || []).length} sessions</span>
              </button>
            ))}
          </div>
        </div>

        {/* Merge Banner */}
        {mergeSource && (
          <div className="merge-banner">
            <Merge size={16} />
            <span>Select a session to merge with <strong>{currentSessions.find(s => s.id === mergeSource)?.name}</strong></span>
            <button className="btn btn-secondary btn-sm" onClick={cancelMerge}><X size={14} /> Cancel</button>
          </div>
        )}

        {/* Session Cards */}
        <div className="manual-entry-section">
          <div className="section-header">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <h3>Sessions for {batches.find(b => b.id === selectedBatch)?.name}</h3>
              {allowedPeriods > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <div style={{ width: '120px', height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${occupancyPct}%`, height: '100%', background: occupancyPct > 100 ? '#ef4444' : '#3b82f6', transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: occupancyPct > 100 ? '#ef4444' : '#6b7280', fontWeight: '500' }}>
                    {assignedPeriods} / {allowedPeriods} periods assigned
                  </span>
                </div>
              )}
            </div>
          </div>

          {currentSessions.length === 0 && (
            <div className="empty-state">
              <BookOpen className="empty-icon" />
              <h4>No Subjects Found</h4>
              <p>No subjects exist for this batch. Add subjects under Institution → Subjects first.</p>
            </div>
          )}

          {currentSessions.length > 0 && (
            <div className="sessions-list">
              {currentSessions.map(session => {
                const isExpanded = expandedSession === session.id;
                const isMergeTarget = mergeSource && mergeSource !== session.id;
                const isMergeSourceActive = mergeSource === session.id;
                const isOriginal = session.isOriginal && !session.isDuplicate;
                const isMerged = session.mergedFrom && session.mergedFrom.length > 0;
                const isRenamingThis = editingName === session.id;

                return (
                  <div
                    key={session.id}
                    className={`session-card ${isExpanded ? 'expanded' : ''} ${isMergeSourceActive ? 'merge-source' : ''} ${isMergeTarget ? 'merge-target' : ''} ${session.disabled ? 'session-disabled' : ''}`}
                    onClick={() => isMergeTarget ? completeMerge(session.id) : null}
                  >
                    <div className="session-card-header">
                      <div className="session-info">
                        {isRenamingThis ? (
                          <div className="inline-rename" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              className="form-input rename-input"
                              value={editNameValue}
                              onChange={e => setEditNameValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveRename(session.id); if (e.key === 'Escape') cancelRename(); }}
                              autoFocus
                            />
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn-icon-only" onClick={() => saveRename(session.id)} title="Save"><Check size={14} /></button>
                              <button className="btn-icon-only" onClick={cancelRename} title="Cancel"><X size={14} /></button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <h4 style={session.disabled ? { textDecoration: 'line-through', opacity: 0.5 } : {}}>{session.name}</h4>
                              {session.isDuplicate && (
                                <button
                                  className="btn-icon-only btn-xs"
                                  onClick={(e) => { e.stopPropagation(); startRename(session); }}
                                  title="Rename copy"
                                  style={{ padding: '0.2rem', minHeight: 'auto', border: 'none' }}
                                >
                                  <Pencil size={12} />
                                </button>
                              )}
                            </div>
                            <span className="subject-code">{session.code}</span>
                          </div>
                        )}

                        <div className="session-badges">
                          {session.type && (
                            <span className={`detail-badge ${session.type === 'lab' || session.type === 'practical' ? 'badge-lab' : 'badge-theory'}`}>
                              {session.type === 'lab' || session.type === 'practical' ? 'Lab' : 'Theory'}
                            </span>
                          )}
                          {session.isDuplicate && (
                            <span className="detail-badge badge-duplicate">Copy</span>
                          )}
                          {session.disabled && (
                            <span className="detail-badge badge-disabled">Disabled</span>
                          )}
                          {isMerged && (
                            <span className="detail-badge badge-merged">{session.subjectIds.length} merged</span>
                          )}
                          {session.linkedBatchIds?.length > 0 && (
                            <span className="detail-badge badge-linked" title={getLinkedBatchNames(session)}>
                              <Link2 size={10} />
                              {session.linkedBatchIds.length} linked
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="session-meta">
                        {!session.disabled && (
                          <span className="session-periods" title="Periodicity">
                            <Clock size={14} /> {freqSummary(session.frequencyConfig).split('=')[0]}
                          </span>
                        )}
                        {session.roomIds?.length > 0 && !session.disabled && (
                          <span className="session-rooms-count" title="Rooms">
                            <DoorOpen size={14} /> {session.roomIds.length}
                          </span>
                        )}
                      </div>

                      <div className="session-actions">
                        {!mergeSource && (
                          <>
                            {!session.disabled && (
                              <>
                                <button
                                  className="btn-icon-only"
                                  onClick={(e) => { e.stopPropagation(); handleDuplicate(session); }}
                                  title="Duplicate session"
                                >
                                  <Copy size={16} />
                                </button>
                                <button
                                  className="btn-icon-only"
                                  onClick={(e) => { e.stopPropagation(); startMerge(session.id); }}
                                  title="Merge with another session"
                                >
                                  <Merge size={16} />
                                </button>
                                {isMerged && (
                                  <button
                                    className="btn-icon-only"
                                    onClick={(e) => { e.stopPropagation(); handleUnmerge(session.id); }}
                                    title="Un-merge sessions"
                                  >
                                    <Unlink size={16} />
                                  </button>
                                )}
                                <button
                                  className="btn-icon-only"
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const next = expandedSession === session.id && expandedSection === 'link' ? null : session.id;
                                    setExpandedSession(next);
                                    setExpandedSection('link');
                                  }}
                                  title="Link batches"
                                  style={{ color: (session.linkedBatchIds?.length > 0 || (expandedSession === session.id && expandedSection === 'link')) ? '#3b82f6' : undefined }}
                                >
                                  <Link2 size={16} />
                                </button>
                                <button
                                  className="btn-icon-only"
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    const next = expandedSession === session.id && expandedSection !== 'link' ? null : session.id;
                                    setExpandedSession(next);
                                    setExpandedSection('freq');
                                  }}
                                  title="Configure details"
                                  style={{ color: (expandedSession === session.id && expandedSection !== 'link') ? '#3b82f6' : undefined }}
                                >
                                  {expandedSession === session.id && expandedSection !== 'link' ? <ChevronUp size={16} /> : <Settings size={16} />}
                                </button>
                              </>
                            )}
                            {isOriginal ? (
                              <button
                                className={`btn-icon-only ${session.disabled ? 'btn-enable' : 'btn-disable'}`}
                                onClick={(e) => { e.stopPropagation(); toggleDisable(session.id); }}
                                title={session.disabled ? 'Enable session' : 'Disable session'}
                              >
                                {session.disabled ? <Eye size={16} /> : <EyeOff size={16} />}
                              </button>
                            ) : (
                              <button
                                className="btn-icon-only btn-delete"
                                onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}
                                title="Remove session"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded Configuration Panel */}
                    {isExpanded && (
                      <div className="session-config-panel" onClick={e => e.stopPropagation()}>
                        {/* Frequency Config */}
                        <div className={`config-section ${expandedSection === 'freq' ? 'active-section' : ''}`} id={`freq-${session.id}`}>
                          <div className="config-section-header">
                            <h5><Clock size={14} /> Weekly Schedule</h5>
                            <span className="config-total">{session.periodsPerWeek} periods/week</span>
                          </div>
                          <div className="freq-rows">
                            {session.frequencyConfig.map((cfg, i) => (
                              <div key={i} className="frequency-row">
                                <span className="freq-row-label">Session {i + 1}</span>
                                <div className="freq-inputs">
                                  <div className="freq-input-group">
                                    <label>Times/week</label>
                                    <input
                                      type="number" min="1"
                                      value={cfg.count}
                                      onChange={e => updateFreq(session.id, i, 'count', e.target.value)}
                                      className="form-input small-input"
                                    />
                                  </div>
                                  <span className="freq-times">×</span>
                                  <div className="freq-input-group">
                                    <label>Periods each</label>
                                    <input
                                      type="number" min="1"
                                      value={cfg.length}
                                      onChange={e => updateFreq(session.id, i, 'length', e.target.value)}
                                      className="form-input small-input"
                                    />
                                  </div>
                                  <span className="freq-result">= {cfg.count * cfg.length} periods</span>
                                </div>
                                {session.frequencyConfig.length > 1 && (
                                  <button type="button" className="btn-icon-only btn-danger" onClick={() => removeFreqRow(session.id, i)}>
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => addFreqRow(session.id)} style={{ marginTop: '0.5rem' }}>
                            + Add Session Type
                          </button>
                        </div>

                        {/* Room Selection (multi-select checkboxes) */}
                        <div className={`config-section ${expandedSection === 'rooms' ? 'active-section' : ''}`} id={`rooms-${session.id}`}>
                          <div className="config-section-header">
                            <h5><DoorOpen size={14} /> Rooms <span className="optional-tag">optional</span></h5>
                            {session.roomIds?.length > 0 && (
                              <span className="config-total">{session.roomIds.length} selected</span>
                            )}
                          </div>
                          {rooms.length === 0 ? (
                            <p className="form-hint">No rooms available. Add rooms under Institution → Rooms.</p>
                          ) : (
                            <div className="room-checkboxes">
                              {rooms.map(room => {
                                const isChecked = (session.roomIds || []).includes(room.id);
                                return (
                                  <label key={room.id} className={`room-checkbox-label ${isChecked ? 'checked' : ''}`}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleRoom(session.id, room.id)}
                                    />
                                    <span className="room-checkbox-name">{room.name}</span>
                                    {room.building && <span className="room-checkbox-detail">{room.building}</span>}
                                    {room.capacity && <span className="room-checkbox-detail">Cap. {room.capacity}</span>}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Link Batches (Combined Session) */}
                        <div className={`config-section ${expandedSection === 'link' ? 'active-section' : ''}`} id={`link-${session.id}`}>
                          <div className="config-section-header">
                            <h5><Link2 size={14} /> Link Batches <span className="optional-tag">combined</span></h5>
                            {session.linkedBatchIds?.length > 0 && (
                              <span className="config-total">{session.linkedBatchIds.length} linked</span>
                            )}
                          </div>
                          <p className="form-hint" style={{ marginBottom: '0.5rem' }}>Select batches that share this session at the same time slot.</p>
                          <div className="room-checkboxes">
                            {batches.filter(b => b.id !== selectedBatch).map(batch => {
                              const isChecked = (session.linkedBatchIds || []).includes(batch.id);
                              // Important: check if target batch has a similar session (ID matching)
                              const targetSessions = sessions[batch.id] || [];
                              const matchFound = targetSessions.some(s => areSessionsSimilar(s, session));

                              return (
                                <label
                                  key={batch.id}
                                  className={`room-checkbox-label ${isChecked ? 'checked' : ''} ${!matchFound ? 'disabled-label' : ''}`}
                                  title={!matchFound ? `Unable to link: Subject '${session.code}' not found in ${batch.name}` : ''}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={!matchFound && !isChecked}
                                    onChange={() => toggleLinkedBatch(session.id, batch.id)}
                                  />
                                  <span className="room-checkbox-name">{batch.name}</span>
                                  <span className="room-checkbox-detail">
                                    {matchFound ? batch.code : '(No matching subject found)'}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setExpandedSession(null)}
                          style={{ alignSelf: 'flex-end' }}
                        >
                          <Check size={14} /> Done
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="step-actions">
        {!isFirstStep && (
          <button className="btn btn-secondary" onClick={onPrevious}>
            <ArrowLeft className="btn-icon-left" />
            Previous
          </button>
        )}
        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="spinner btn-icon-left" />
              Saving...
            </>
          ) : (
            <>
              Save &amp; Continue
              <ArrowRight className="btn-icon-right" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}