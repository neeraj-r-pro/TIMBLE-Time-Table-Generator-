import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    GripVertical,
    AlertCircle,
    CheckCircle2,
    Layers,
    Layout,
    ArrowLeft,
    Info,
    User,
    MapPin,
    Link2
} from 'lucide-react';
import { checkConflict } from '../../../utils/conflictChecker';
import './ManualTimetableEditor.css';

const MAX_HOLDING = 7;

export function ManualTimetableEditor({ data, onComplete, onPrevious }) {
    const [batchSchedules, setBatchSchedules] = useState(data.generatedTimetables || {});
    const [unassignedSessions, setUnassignedSessions] = useState([]);
    const [viewMode, setViewMode] = useState('weekly'); // Default to weekly (batch-wise)
    const [selectedDay, setSelectedDay] = useState('monday');
    const [selectedBatchId, setSelectedBatchId] = useState(data.batches?.[0]?.id || '');
    const [faculties, setFaculties] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [draggedSession, setDraggedSession] = useState(null);
    const [dragOverTarget, setDragOverTarget] = useState(null);
    const [toast, setToast] = useState(null);

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const batches = data.batches || [];

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const { facultiesAPI, roomsAPI } = await import('../../../services/api');
                const [fList, rList] = await Promise.all([
                    facultiesAPI.getAll(),
                    roomsAPI.getAll()
                ]);
                setFaculties(fList);
                setRooms(rList);
            } catch (err) {
                console.error('Error fetching editor metadata:', err);
            }
        };
        fetchMetadata();
    }, []);

    const timeSlots = useMemo(() => {
        const slots = new Set();
        Object.values(batchSchedules).forEach(batchTt => {
            Object.values(batchTt).forEach(periods => {
                periods.forEach(p => slots.add(p.time));
            });
        });
        return Array.from(slots).sort();
    }, [batchSchedules]);

    useEffect(() => {
        if (data.generationStats?.conflictDetails) {
            const conflictSessions = data.generationStats.conflictDetails.map(c => ({
                subject: c.subjectName,
                faculty: 'TBA',
                room: 'TBA',
                type: 'theory',
                consecutivePeriods: c.consecutivePeriods || 1,
                _subjectId: c.subjectId,
                _batchId: c.batchId,
                id: `conflict-${Math.random().toString(36).substr(2, 9)}`
            }));
            const existingIds = new Set(unassignedSessions.map(s => s.id));
            const newSessions = conflictSessions.filter(s => !existingIds.has(s.id));
            if (newSessions.length > 0) {
                setUnassignedSessions(prev => [...prev, ...newSessions]);
            }
        }
    }, [data.generationStats]);

    const showToast = useCallback((type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // ── Helper: detect contiguous same-subject block size at a position ──
    const detectBlockSize = useCallback((batchId, day, subjectId, startIdx) => {
        const periods = batchSchedules[batchId]?.[day] || [];
        let count = 0;
        for (let i = startIdx; i < timeSlots.length; i++) {
            const sess = periods.find(p => p.time === timeSlots[i]);
            if (sess && sess._subjectId === subjectId) {
                count++;
            } else {
                break;
            }
        }
        return Math.max(count, 1);
    }, [batchSchedules, timeSlots]);

    // ── Helper: find the start time of a contiguous same-subject block ──
    const findBlockStart = useCallback((batchId, day, session, clickedTime) => {
        if (!batchId || !day || !clickedTime) return clickedTime;

        const batchDayPeriods = batchSchedules[batchId]?.[day] || [];
        const currentIdx = timeSlots.indexOf(clickedTime);
        let startIdx = currentIdx;

        // Walk backwards to find the first slot of this contiguous block
        while (startIdx > 0) {
            const prevSlot = timeSlots[startIdx - 1];
            const prevSession = batchDayPeriods.find(p => p.time === prevSlot);
            if (prevSession && prevSession._subjectId === session._subjectId) {
                startIdx--;
            } else {
                break;
            }
        }
        return timeSlots[startIdx];
    }, [batchSchedules, timeSlots]);

    // ── Helper: get effective consecutive count (from field OR detected) ──
    const getEffectiveConsecutive = useCallback((session, batchId, day, startTime) => {
        if (session.consecutivePeriods && session.consecutivePeriods > 1) {
            return session.consecutivePeriods;
        }
        // Detect contiguous same-subject sessions
        if (batchId && day && startTime) {
            const startIdx = timeSlots.indexOf(startTime);
            return detectBlockSize(batchId, day, session._subjectId, startIdx);
        }
        return 1;
    }, [timeSlots, detectBlockSize]);

    // ── Helper: check if a slot is a break/lunch ──
    const isBreakSlot = useCallback((batchId, day, time) => {
        const periods = batchSchedules[batchId]?.[day] || [];
        const existing = periods.find(p => p.time === time);
        return existing && (existing.type === 'break' || existing.type === 'lunch');
    }, [batchSchedules]);

    // ── DRAG START ──
    const handleDragStart = (e, session, fromBatchId, fromDay, fromTime) => {
        let normalizedTime = fromTime;
        let effectiveConsecutive = session.consecutivePeriods || 1;

        if (fromBatchId && fromDay && fromTime) {
            normalizedTime = findBlockStart(fromBatchId, fromDay, session, fromTime);
            effectiveConsecutive = getEffectiveConsecutive(session, fromBatchId, fromDay, normalizedTime);
        }

        const normalizedSession = fromBatchId
            ? { ...((batchSchedules[fromBatchId]?.[fromDay] || []).find(p => p.time === normalizedTime) || session), consecutivePeriods: effectiveConsecutive }
            : session;

        setDraggedSession({ session: normalizedSession, fromBatchId, fromDay, fromTime: normalizedTime });
        e.dataTransfer.setData('text/plain', 'drag');
        e.dataTransfer.effectAllowed = 'move';
    };

    // ── MAIN DROP HANDLER ──
    const handleDrop = (e, targetBatchId, targetTime, targetDay) => {
        e.preventDefault();
        setDragOverTarget(null);
        if (!draggedSession) return;

        const { session, fromBatchId, fromDay, fromTime } = draggedSession;
        const consecutive = session.consecutivePeriods || 1;
        const activeDay = targetDay || selectedDay;

        // ── Validation 1: Prevent cross-batch moves (unless combined) ──
        const isCombined = session._isCombined && session._combinedBatchIds?.length > 0;
        if (fromBatchId && fromBatchId !== targetBatchId && !isCombined) {
            showToast('error', 'Cannot move sessions between different batches.');
            setDraggedSession(null);
            return;
        }
        // Also prevent holding-area sessions going to wrong batch (unless combined)
        if (!fromBatchId && session._batchId && session._batchId !== targetBatchId && !isCombined) {
            showToast('error', `This session belongs to a different batch. Switch to that batch first.`);
            setDraggedSession(null);
            return;
        }

        // Same position — no-op
        if (fromBatchId === targetBatchId && fromDay === activeDay && fromTime === targetTime) {
            setDraggedSession(null);
            return;
        }

        const targetIdx = timeSlots.indexOf(targetTime);
        const neededSlots = timeSlots.slice(targetIdx, targetIdx + consecutive);

        if (neededSlots.length < consecutive) {
            showToast('error', `Not enough slots for a ${consecutive}-period session.`);
            setDraggedSession(null);
            return;
        }

        // ── Validation 2: Prevent allocation to break/lunch slots ──
        for (const slot of neededSlots) {
            if (isBreakSlot(targetBatchId, activeDay, slot)) {
                showToast('error', 'Cannot place a session on a break/lunch slot.');
                setDraggedSession(null);
                return;
            }
        }

        // Deep-clone schedules for safe tentative manipulation
        const tentative = JSON.parse(JSON.stringify(batchSchedules));

        // Check what's at the target — potential swap candidate
        const targetPeriods = tentative[targetBatchId]?.[activeDay] || [];
        const existingAtTarget = targetPeriods.find(p => p.time === targetTime);
        const isTargetOccupied = existingAtTarget && existingAtTarget.type !== 'break' && existingAtTarget.type !== 'lunch';

        if (isTargetOccupied) {
            // ── SWAP LOGIC ──
            if (!fromBatchId) {
                showToast('error', 'Target slot is occupied. Drag to an empty slot.');
                setDraggedSession(null);
                return;
            }

            // Gather full block at target
            const swapStartTime = findBlockStart(targetBatchId, activeDay, existingAtTarget, targetTime);
            const swapConsec = getEffectiveConsecutive(existingAtTarget, targetBatchId, activeDay, swapStartTime);
            const swapStartIdx = timeSlots.indexOf(swapStartTime);
            const swapBlockSlots = timeSlots.slice(swapStartIdx, swapStartIdx + swapConsec);
            const swapSession = { ...existingAtTarget, time: swapStartTime, consecutivePeriods: swapConsec };

            const fromIdx = timeSlots.indexOf(fromTime);
            const fromSlots = timeSlots.slice(fromIdx, fromIdx + consecutive);

            // Check swap target fits in source's old position
            const swapNeededSlots = timeSlots.slice(fromIdx, fromIdx + swapConsec);
            if (swapNeededSlots.length < swapConsec) {
                showToast('error', 'Swap failed — not enough room at the source position.');
                setDraggedSession(null);
                return;
            }

            // Check swap target slots aren't breaks
            for (const slot of swapNeededSlots) {
                if (isBreakSlot(fromBatchId, fromDay, slot)) {
                    showToast('error', 'Cannot swap — source position has a break slot.');
                    setDraggedSession(null);
                    return;
                }
            }

            // Remove both blocks from tentative
            tentative[fromBatchId][fromDay] = tentative[fromBatchId][fromDay].filter(p => !fromSlots.includes(p.time));
            tentative[targetBatchId][activeDay] = tentative[targetBatchId][activeDay].filter(p => !swapBlockSlots.includes(p.time));

            // Conflict check: dragged session → target position
            for (const slot of neededSlots) {
                const conflict = checkConflict(
                    { ...session, _batchId: targetBatchId },
                    activeDay, slot, tentative, faculties, rooms
                );
                if (conflict) {
                    showToast('error', `Swap blocked: ${conflict.message}`);
                    setDraggedSession(null);
                    return;
                }
            }

            // Conflict check: target session → source position
            for (const slot of swapNeededSlots) {
                const conflict = checkConflict(
                    { ...swapSession, _batchId: fromBatchId },
                    fromDay, slot, tentative, faculties, rooms
                );
                if (conflict) {
                    showToast('error', `Swap blocked: ${conflict.message}`);
                    setDraggedSession(null);
                    return;
                }
            }

            // ✅ Swap is safe — place both
            neededSlots.forEach(slot => {
                tentative[targetBatchId][activeDay].push({ ...session, time: slot, _batchId: targetBatchId });
            });
            swapNeededSlots.forEach(slot => {
                tentative[fromBatchId][fromDay].push({ ...swapSession, time: slot, _batchId: fromBatchId });
            });

            setBatchSchedules(tentative);
            setDraggedSession(null);
            showToast('success', 'Sessions swapped!');
            return;
        }

        // ── Simple move (no swap) ──
        if (fromBatchId && fromDay && fromTime) {
            const fromIdx = timeSlots.indexOf(fromTime);
            const fromSlots = timeSlots.slice(fromIdx, fromIdx + consecutive);
            tentative[fromBatchId][fromDay] = tentative[fromBatchId][fromDay].filter(p => !fromSlots.includes(p.time));
        }

        // Conflict check
        for (const slot of neededSlots) {
            const conflict = checkConflict(
                { ...session, _batchId: targetBatchId },
                activeDay, slot, tentative, faculties, rooms
            );
            if (conflict) {
                showToast('error', conflict.message);
                setDraggedSession(null);
                return;
            }
        }

        // ✅ Move is safe
        if (!fromBatchId) {
            setUnassignedSessions(prev => prev.filter(s => s.id !== session.id));
        }
        if (!tentative[targetBatchId]) tentative[targetBatchId] = {};
        if (!tentative[targetBatchId][activeDay]) tentative[targetBatchId][activeDay] = [];

        neededSlots.forEach(slot => {
            tentative[targetBatchId][activeDay].push({ ...session, time: slot, _batchId: targetBatchId });
        });

        // ── Combined session: replicate move to all linked batches ──
        if (session._isCombined && session._combinedBatchIds) {
            for (const linkedBatchId of session._combinedBatchIds) {
                if (linkedBatchId === targetBatchId) continue;
                if (!tentative[linkedBatchId]) continue;

                // Remove from old position in linked batch
                if (fromBatchId && fromDay && fromTime) {
                    const fromIdx = timeSlots.indexOf(fromTime);
                    const fromSlots = timeSlots.slice(fromIdx, fromIdx + consecutive);
                    if (tentative[linkedBatchId][fromDay]) {
                        tentative[linkedBatchId][fromDay] = tentative[linkedBatchId][fromDay].filter(
                            p => !fromSlots.includes(p.time) || p._combinedGroupId !== session._combinedGroupId
                        );
                    }
                }

                // Place at new position in linked batch
                if (!tentative[linkedBatchId][activeDay]) tentative[linkedBatchId][activeDay] = [];
                neededSlots.forEach(slot => {
                    tentative[linkedBatchId][activeDay].push({ ...session, time: slot, _batchId: linkedBatchId });
                });
            }
        }

        setBatchSchedules(tentative);
        setDraggedSession(null);
        showToast('success', session._isCombined ? 'Combined session moved across all linked batches!' : 'Session moved!');
    };

    // ── DROP TO HOLDING ──
    const handleDropToHolding = (e) => {
        e.preventDefault();
        setDragOverTarget(null);
        if (!draggedSession || !draggedSession.fromBatchId) return;

        if (unassignedSessions.length >= MAX_HOLDING) {
            showToast('error', `Holding area full (max ${MAX_HOLDING}).`);
            setDraggedSession(null);
            return;
        }

        const { session, fromBatchId, fromDay, fromTime } = draggedSession;
        const consecutive = session.consecutivePeriods || 1;

        const nextSchedules = JSON.parse(JSON.stringify(batchSchedules));
        const fromIdx = timeSlots.indexOf(fromTime);
        const fromSlots = timeSlots.slice(fromIdx, fromIdx + consecutive);
        nextSchedules[fromBatchId][fromDay] = nextSchedules[fromBatchId][fromDay].filter(p => !fromSlots.includes(p.time));

        setUnassignedSessions(prev => [...prev, { ...session, id: `held-${Date.now()}` }]);
        setBatchSchedules(nextSchedules);
        setDraggedSession(null);
        showToast('success', 'Moved to holding area.');
    };

    const handleDragOver = (e, rowId, slot) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverTarget({ rowId, slot });
    };

    const handleSave = () => {
        onComplete({ ...data, generatedTimetables: batchSchedules, unassignedSessions });
    };

    const rowData = viewMode === 'daily' ? batches : days;

    // ── Helper for rendering: detect if this slot is a continuation cell ──
    const isContinuationCell = useCallback((batchDayPeriods, session, slot, sIdx) => {
        if (!session || session.type === 'break' || session.type === 'lunch') return false;
        if (sIdx === 0) return false;
        const prevSlot = timeSlots[sIdx - 1];
        const prevSession = batchDayPeriods.find(p => p.time === prevSlot);
        return prevSession && prevSession._subjectId === session._subjectId;
    }, [timeSlots]);

    // ── Helper: compute colspan for a session block ──
    const getColSpan = useCallback((batchDayPeriods, session, slot, sIdx, batchId, day) => {
        if (!session || session.type === 'break' || session.type === 'lunch') return 1;
        if (session.consecutivePeriods && session.consecutivePeriods > 1) return session.consecutivePeriods;
        // Detect forward contiguous
        const startIdx = timeSlots.indexOf(slot);
        return detectBlockSize(batchId, day, session._subjectId, startIdx);
    }, [timeSlots, detectBlockSize]);

    return (
        <div className="manual-editor">
            <div className="editor-header">
                <div className="header-main">
                    <Layout className="header-icon" />
                    <div>
                        <h2>Refine Timetable</h2>
                        <p>Drag to rearrange, drop on another to swap. Sessions stay within their batch.</p>
                    </div>
                </div>
                <div className="header-actions">
                    <div className="view-mode-switcher">
                        <button className={`mode-btn ${viewMode === 'daily' ? 'active' : ''}`} onClick={() => setViewMode('daily')}>Daily</button>
                        <button className={`mode-btn ${viewMode === 'weekly' ? 'active' : ''}`} onClick={() => setViewMode('weekly')}>Weekly</button>
                    </div>
                    {viewMode === 'daily' ? (
                        <div className="day-selector">
                            {days.map(day => (
                                <button key={day} className={`day-btn ${selectedDay === day ? 'active' : ''}`} onClick={() => setSelectedDay(day)}>
                                    {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <select className="batch-select" value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)}>
                            {batches.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
                        </select>
                    )}
                </div>
            </div>

            <div className="editor-body">
                <div className="editor-grid-wrapper">
                    <table className="editor-grid">
                        <thead>
                            <tr>
                                <th className="batch-col">{viewMode === 'daily' ? 'Batch' : 'Day'}</th>
                                {timeSlots.map(slot => (<th key={slot} className="time-col">{slot}</th>))}
                            </tr>
                        </thead>
                        <tbody>
                            {rowData.map(row => {
                                const rowId = viewMode === 'daily' ? row.id : row;
                                const rowName = viewMode === 'daily' ? row.name : row.charAt(0).toUpperCase() + row.slice(1);
                                const rowSub = viewMode === 'daily' ? row.code : '';

                                return (
                                    <tr key={rowId}>
                                        <td className="batch-name-cell">
                                            <div className="batch-id">{rowName}</div>
                                            {rowSub && <div className="batch-code">{rowSub}</div>}
                                        </td>
                                        {timeSlots.map((slot, sIdx) => {
                                            const activeBatchId = viewMode === 'daily' ? rowId : selectedBatchId;
                                            const activeDay = viewMode === 'daily' ? selectedDay : rowId;
                                            const batchDayPeriods = batchSchedules[activeBatchId]?.[activeDay] || [];
                                            const session = batchDayPeriods.find(p => p.time === slot);
                                            const isBreak = session?.type === 'break' || session?.type === 'lunch';

                                            // Skip continuation cells
                                            if (session && !isBreak && isContinuationCell(batchDayPeriods, session, slot, sIdx)) {
                                                return null;
                                            }

                                            const colSpan = session && !isBreak ? getColSpan(batchDayPeriods, session, slot, sIdx, activeBatchId, activeDay) : 1;
                                            const isDragOver = dragOverTarget?.rowId === rowId && dragOverTarget?.slot === slot;
                                            const hasSession = session && !isBreak;
                                            const dragOverClass = isDragOver ? (hasSession ? 'drag-over-swap' : 'drag-over') : '';

                                            return (
                                                <td
                                                    key={`${rowId}-${slot}`}
                                                    className={`slot-cell ${session ? (isBreak ? 'break-cell' : 'filled-cell') : 'empty-cell'} ${dragOverClass}`}
                                                    colSpan={colSpan}
                                                    onDragOver={(e) => !isBreak && handleDragOver(e, rowId, slot)}
                                                    onDragLeave={() => setDragOverTarget(null)}
                                                    onDrop={(e) => !isBreak && handleDrop(e, activeBatchId, slot, activeDay)}
                                                >
                                                    {session ? (
                                                        <div
                                                            className={`session-card ${session.type}`}
                                                            draggable={!isBreak}
                                                            onDragStart={(e) => !isBreak && handleDragStart(e, session, activeBatchId, activeDay, slot)}
                                                        >
                                                            {!isBreak && <GripVertical className="drag-handle" size={11} />}
                                                            <div className="session-info">
                                                                <div className="session-sub" title={session.subject}>{session.subject}</div>
                                                                <div className="session-details">
                                                                    <div className="session-faculty"><User size={9} className="card-icon" /><span>{session.faculty}</span></div>
                                                                    <div className="session-room"><MapPin size={9} className="card-icon" /><span>{session.room}</span></div>
                                                                </div>
                                                            </div>
                                                            {!isBreak && colSpan > 1 && <span className="block-badge">{colSpan}h</span>}
                                                            {!isBreak && session._isCombined && <span className="block-badge" style={{ background: '#2563eb' }} title={`Combined: ${session._combinedBatchIds?.join(', ')}`}><Link2 size={8} /></span>}
                                                        </div>
                                                    ) : null}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div
                    className={`holding-area ${dragOverTarget === 'holding' ? 'holding-drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOverTarget('holding'); }}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={handleDropToHolding}
                >
                    <div className="holding-header">
                        <Layers size={14} />
                        <h3>Holding</h3>
                        <span className="holding-count">{unassignedSessions.length}/{MAX_HOLDING}</span>
                    </div>
                    <div className="holding-list">
                        {unassignedSessions.length === 0 ? (
                            <div className="empty-holding"><Info size={16} opacity={0.3} /><span>Drop sessions here</span></div>
                        ) : (
                            unassignedSessions.map(session => (
                                <div key={session.id} className={`session-card ${session.type} held`} draggable onDragStart={(e) => handleDragStart(e, session, null, null, null)}>
                                    <GripVertical className="drag-handle" size={10} />
                                    <div className="session-info">
                                        <div className="session-sub">{session.subject}</div>
                                        <div className="session-batch">{batches.find(b => b.id === session._batchId)?.name || '?'}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {toast && (
                <div className={`editor-toast ${toast.type}`}>
                    {toast.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                    <span>{toast.message}</span>
                </div>
            )}

            <div className="step-actions">
                <button className="btn btn-secondary" onClick={onPrevious}><ArrowLeft className="btn-icon-left" />Back</button>
                <button className="btn btn-primary" onClick={handleSave}><CheckCircle2 className="btn-icon" />Finish & Save</button>
            </div>
        </div>
    );
}
