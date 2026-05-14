/**
 * Utility for real-time timetable conflict detection
 */

/**
 * Checks if moving a session to a specific slot creates any conflicts
 * @param {Object} session The session being moved
 * @param {String} day The target day
 * @param {String} time The target time slot
 * @param {Object} batchSchedules Current state of all batch timetables
 * @param {Array} faculties List of all faculties
 * @param {Array} rooms List of all rooms
 * @returns {Object|null} Conflict details or null if no conflict
 */
export const checkConflict = (session, day, time, batchSchedules, faculties, rooms) => {
    const facultyId = session._facultyId;
    const roomId = session._roomId;
    const batchId = session._batchId;
    const combinedGroupId = session._combinedGroupId || null;

    // 1. Faculty Conflict: Is this faculty busy in another batch at the same time?
    for (const [otherBatchId, dayTimetable] of Object.entries(batchSchedules)) {
        if (otherBatchId === batchId) continue;

        const dayPeriods = dayTimetable[day] || [];
        const conflict = dayPeriods.find(p => p.time === time && p._facultyId === facultyId);

        if (conflict) {
            // Skip if both belong to the same combined group (intentional sharing)
            if (combinedGroupId && conflict._combinedGroupId === combinedGroupId) continue;

            return {
                type: 'faculty',
                message: `Faculty is already assigned to ${conflict.subject} in another batch at this time.`
            };
        }
    }

    // 2. Room Conflict: Is this room occupied by another batch at the same time?
    if (roomId) {
        for (const [otherBatchId, dayTimetable] of Object.entries(batchSchedules)) {
            if (otherBatchId === batchId) continue;

            const dayPeriods = dayTimetable[day] || [];
            const conflict = dayPeriods.find(p => p.time === time && p._roomId === roomId);

            if (conflict) {
                // Skip if both belong to the same combined group (intentional sharing)
                if (combinedGroupId && conflict._combinedGroupId === combinedGroupId) continue;

                return {
                    type: 'room',
                    message: `Room is already occupied by ${conflict.subject} in another batch at this time.`
                };
            }
        }
    }

    // 3. Batch Conflict: Is the batch already busy?
    const currentBatchDayPeriods = batchSchedules[batchId]?.[day] || [];
    const batchConflict = currentBatchDayPeriods.find(p => p.time === time);
    if (batchConflict && batchConflict.subject !== session.subject) {
        return {
            type: 'batch',
            message: `Batch already has ${batchConflict.subject} scheduled at this time.`
        };
    }

    return null;
};
