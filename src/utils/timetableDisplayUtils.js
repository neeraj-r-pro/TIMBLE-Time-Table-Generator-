/**
 * Helpers for timetable grids: merging consecutive teaching slots,
 * faculty labels from preferences, and class/break ordering.
 */

function stripCombinedSuffix(name) {
  return String(name || '')
    .replace(/\s*\[Combined]\s*$/i, '')
    .trim();
}

function isBreakLike(period) {
  if (!period) return false;
  const t = period.type;
  return t === 'break' || t === 'lunch' || t === 'assembly';
}

/** Normalize "9:00", "09:00:00" -> "09:00" for comparison */
export function normalizeTimeToken(t) {
  if (t == null) return '';
  const parts = String(t).trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || '0', 10);
  if (Number.isNaN(h)) return String(t).trim();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parsePeriodTimeRange(timeStr) {
  const raw = String(timeStr || '').trim();
  const normalized = raw.replace(/\s*-\s*/g, '-');
  const idx = normalized.indexOf('-');
  if (idx === -1) return { start: '', end: '' };
  return {
    start: normalizeTimeToken(normalized.slice(0, idx)),
    end: normalizeTimeToken(normalized.slice(idx + 1)),
  };
}

export function timesChainOnSlotBoundary(periodA, periodB) {
  const { end: endA } = parsePeriodTimeRange(periodA.time);
  const { start: startB } = parsePeriodTimeRange(periodB.time);
  return endA && startB && endA === startB;
}

export function sameTeachingBlock(periodA, periodB) {
  if (!periodA || !periodB) return false;
  if (isBreakLike(periodA) || isBreakLike(periodB)) return false;
  if (!timesChainOnSlotBoundary(periodA, periodB)) return false;

  const ida = periodA._subjectId;
  const idb = periodB._subjectId;
  if (ida != null && idb != null && String(ida) === String(idb)) {
    return (periodA.faculty || '') === (periodB.faculty || '');
  }

  return (
    stripCombinedSuffix(periodA.subject) === stripCombinedSuffix(periodB.subject) &&
    (periodA.faculty || '') === (periodB.faculty || '') &&
    (periodA.room || '') === (periodB.room || '')
  );
}

export function findPeriodForSlot(dayPeriods, timeSlot) {
  return (dayPeriods || []).find((p) => p.time === timeSlot);
}

/**
 * skip[i] === true: this column continues the teaching block in the previous column
 * (same subject / chain). Header stays one column per time slot; body uses empty
 * continuation cells so consecutive hours are not visually split by layout.
 */
export function computeTeachingContinuationFlags(dayPeriods, timeSlots) {
  const skip = timeSlots.map(() => false);

  for (let i = 0; i < timeSlots.length; i++) {
    if (skip[i]) continue;
    const p = findPeriodForSlot(dayPeriods, timeSlots[i]);
    if (!p || isBreakLike(p)) continue;

    for (let j = i + 1; j < timeSlots.length; j++) {
      const prev = findPeriodForSlot(dayPeriods, timeSlots[j - 1]);
      const cur = findPeriodForSlot(dayPeriods, timeSlots[j]);
      if (!cur || isBreakLike(cur)) break;
      if (!sameTeachingBlock(prev, cur)) break;
      skip[j] = true;
    }
  }
  return { skip };
}

/** Merged time label for a run starting at startIdx until skip is false. */
export function mergedTimeLabelForRun(dayPeriods, timeSlots, startIdx, skip) {
  if (skip[startIdx]) return timeSlots[startIdx];
  let endIdx = startIdx;
  for (let k = startIdx + 1; k < timeSlots.length && skip[k]; k++) endIdx = k;
  const first = findPeriodForSlot(dayPeriods, timeSlots[startIdx]);
  const last = findPeriodForSlot(dayPeriods, timeSlots[endIdx]);
  if (!first || !last) return timeSlots[startIdx];
  const { start } = parsePeriodTimeRange(first.time);
  const { end } = parsePeriodTimeRange(last.time);
  if (start && end) return `${start} - ${end}`;
  return timeSlots[startIdx];
}

/** Put all class periods first (by time), then breaks/lunch (by time). */
export function sortPeriodsClassesBeforeBreaks(dayPeriods) {
  const arr = [...(dayPeriods || [])];
  arr.sort((a, b) => {
    const aBr = isBreakLike(a);
    const bBr = isBreakLike(b);
    if (aBr !== bBr) return aBr ? 1 : -1;
    const aTime = String(a.time || '').split('-')[0];
    const bTime = String(b.time || '').split('-')[0];
    return aTime.localeCompare(bTime);
  });
  return arr;
}

/**
 * Build map subject_id -> sorted unique faculty names from timetable faculty_preferences rows.
 * Each row: { faculty_id, subject_slots, faculties: { name } }
 */
export function buildSubjectIdToFacultyNamesMap(prefsRows) {
  const map = new Map();
  for (const row of prefsRows || []) {
    const fname =
      row.faculties?.name ||
      row.faculty?.name ||
      '';
    const slots = row.subject_slots || row.subjectSlots || {};
    for (const sid of Object.values(slots)) {
      if (!sid) continue;
      if (!map.has(sid)) map.set(sid, new Set());
      if (fname) map.get(sid).add(fname);
    }
  }
  return map;
}

export function formatFacultyListForSubject(subjectId, primaryFacultyName, subjectFacultyMap) {
  const names = new Set();
  if (primaryFacultyName) names.add(primaryFacultyName);
  const fromPrefs = subjectId && subjectFacultyMap?.get(subjectId);
  if (fromPrefs) {
    for (const n of fromPrefs) {
      if (n) names.add(n);
    }
  }
  return [...names].join(', ');
}
