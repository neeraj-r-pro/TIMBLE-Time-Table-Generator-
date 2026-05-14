const fs = require('fs');

const path = 'src/utils/timetableGenerator.js';
let content = fs.readFileSync(path, 'utf8');

// Insert imports
if (!content.includes('import { solveCSP }')) {
    content = content.replace(
        "// Fisher-Yates shuffle",
        "import { solveCSP } from './cspSolver';\nimport { calculatePenalty, optimizeTimetableLocalSearch } from './cspEngine';\n\n// Fisher-Yates shuffle"
    );
}

// Extract old loop
const startMarker = "// ── Schedule each session using least-loaded-day strategy + randomization ──";
const endMarker = "// ── Add breaks and lunch from the batch's schedule ───────────────────────";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex > -1 && endIndex > -1) {
    const cspLogic = `// ── CSP Variable Setup ──
    const unassignedVars = allSessions.map((session, index) => {
      let domain = [];
      const { consecutivePeriods } = session;

      // randomize domain to maintain varied timetables
      for (const day of shuffle([...days])) {
        const rawPeriods = classPeriods[day] || [];
        if (rawPeriods.length < consecutivePeriods) continue;

        for (let i = 0; i <= rawPeriods.length - consecutivePeriods; i++) {
          const periodGroup = rawPeriods.slice(i, i + consecutivePeriods);
          
          if (!periodGroup.every(p => !batchUsedPeriods[day].has(p.startTime))) continue;

          let blockAssignments = [];
          let allCanAssign = true;

          const members = session.type === 'group' ? session.groupMembers : [session.subject];
          
          for (const member of members) {
            const result = consecutivePeriods > 1 ? 
              canAssignPeriods(periodGroup, member, day, facultySchedule, roomSchedule, batch, rooms, faculties, facultyPreferences, allowFacultyPreferences) :
              canAssignPeriod(periodGroup[0], member, day, facultySchedule, roomSchedule, batch, rooms, faculties, facultyPreferences, allowFacultyPreferences);
            
            if (result) blockAssignments.push({ member, facultyId: result.facultyId });
            else { allCanAssign = false; break; }
          }

          if (allCanAssign) {
            domain.push({ day, periodGroup, blockAssignments });
          }
        }
      }
      return { ...session, id: index, domain };
    });

    const stateFunctions = {
      canAssign: (v, val) => {
        if (!val.periodGroup.every(p => !batchUsedPeriods[val.day].has(p.startTime))) return false;
        
        for (const asm of val.blockAssignments) {
          const result = v.consecutivePeriods > 1 ? 
            canAssignPeriods(val.periodGroup, asm.member, val.day, facultySchedule, roomSchedule, batch, rooms, faculties, facultyPreferences, allowFacultyPreferences) :
            canAssignPeriod(val.periodGroup[0], asm.member, val.day, facultySchedule, roomSchedule, batch, rooms, faculties, facultyPreferences, allowFacultyPreferences);
          
          if (!result || result.facultyId !== asm.facultyId) return false;
        }
        return true;
      },
      assign: (v, val) => {
        val.periodGroup.forEach(p => batchUsedPeriods[val.day].add(p.startTime));
        val.blockAssignments.forEach(asm => {
          const room = findAvailableRoom(asm.member, rooms, roomSchedule, val.day, val.periodGroup[0]);
          val.periodGroup.forEach((p, idx) => {
            const assignedSubject = { ...asm.member, facultyId: asm.facultyId };
            const entry = createTimetableEntry(p, assignedSubject, val.day, room, idx, faculties, batch);
            
            if (v.type === 'group') {
               entry.subject += asm.member.groupName ? \` [\${asm.member.groupName}]\` : '';
               entry.isGroupSession = true;
               entry.groupSetId = v.groupSetId;
            }
            
            entry._asmId = asm.member.id; // helps identifying for unassign
            batchTimetable[val.day].push(entry);
            markPeriodUsed(p, assignedSubject, room, val.day, facultySchedule, roomSchedule, faculties, stats);
          });
        });
      },
      unassign: (v, val) => {
        val.periodGroup.forEach(p => batchUsedPeriods[val.day].delete(p.startTime));
        val.blockAssignments.forEach(asm => {
          const assignedSubject = { ...asm.member, facultyId: asm.facultyId };
          const room = findAvailableRoom(asm.member, rooms, roomSchedule, val.day, val.periodGroup[0]); 
          
          val.periodGroup.forEach(p => {
             unmarkPeriodUsed(p, assignedSubject, room, val.day, facultySchedule, roomSchedule, faculties, stats);
             // Remove from batchTimetable
             const dayArr = batchTimetable[val.day];
             for (let i = dayArr.length - 1; i >= 0; i--) {
                const entry = dayArr[i];
                if (entry.time.startsWith(p.startTime) && entry._asmId === asm.member.id) {
                    dayArr.splice(i, 1);
                    break;
                }
             }
          });
        });
      }
    };

    // Run CSP
    const { success, assignments } = solveCSP(unassignedVars, stateFunctions, 10000);

    // Filter unassigned
    const assignedIds = new Set(assignments.map(a => a.variable.id));
    for (const v of unassignedVars) {
      if (!assignedIds.has(v.id)) {
         stats.conflicts = (stats.conflicts || 0) + 1;
         const subName = v.subject?.name || v.groupMembers?.map(m => m.name).join(', ') || v.subjectKey;
         stats.conflictDetails.push({
           batchId: batch.id,
           batchName: batch.name || batch.code || batch.id,
           subjectName: subName,
           subjectKey: v.subjectKey,
           consecutivePeriods: v.consecutivePeriods,
           reason: \`CSP Solver failed to place this session without causing conflicts.\`
         });
      }
    }

    `;

    content = content.substring(0, startIndex) + cspLogic + content.substring(endIndex);
}

// Add unmarkPeriodUsed
if (!content.includes('function unmarkPeriodUsed')) {
    content += `

function unmarkPeriodUsed(period, subject, room, day, facultySchedule, roomSchedule, faculties, stats) {
  const facultyId = subject.facultyId || (subject.faculty ? faculties.find(f => f.name === subject.faculty)?.id : null);

  if (facultyId && facultySchedule.has(facultyId)) {
    const arr = facultySchedule.get(facultyId)[day];
    if (arr) {
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].startTime === period.startTime) {
          arr.splice(i, 1);
          break;
        }
      }
    }
    if (stats.facultyLoad[facultyId]) stats.facultyLoad[facultyId]--;
  }

  if (room && roomSchedule.has(room.id)) {
    const arr = roomSchedule.get(room.id)[day];
    if (arr) {
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].startTime === period.startTime) {
          arr.splice(i, 1);
          break;
        }
      }
    }
  }
}
`;
}

// Insert Local Search hook at the end of generateTimetable
const generateReturnIndex = content.lastIndexOf("return { generatedTimetables, stats };");
if (generateReturnIndex > -1 && !content.includes('optimizeTimetableLocalSearch')) {
    const hook = `
  // Local Search Optimization
  const currentState = {
     generatedTimetables,
     facultySchedule,
     roomSchedule,
     batchUsedPeriodsMap,
     stats,
     dayLoad: {}
  };
  // To keep performance high on UI thread, we only run local search lightly
  // optimizeTimetableLocalSearch(currentState, unassignedVars);
  
  `;
    content = content.substring(0, generateReturnIndex) + hook + content.substring(generateReturnIndex);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Update Complete.');
