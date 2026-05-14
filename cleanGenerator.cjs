const fs = require('fs');

const path = 'src/utils/timetableGenerator.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix imports
content = content.replace(
    "import { calculatePenalty, optimizeTimetableLocalSearch } from './cspEngine';",
    "import { calculatePenalty } from './cspEngine';"
);

// 2. Remove subjectDaysUsed
content = content.replace(
    "    // Track which subjects are already on which days (for distribution)\n    const subjectDaysUsed = {}; // subjectKey -> Set of days",
    ""
);

// 3. Keep success used, log it or something
content = content.replace(
    "const { success, assignments } = solveCSP(unassignedVars, stateFunctions, 10000);",
    "const cspResult = solveCSP(unassignedVars, stateFunctions, 10000);\n    const assignments = cspResult.assignments;"
);
// Also replace `if (!success)` to `if (!cspResult.success)`
content = content.replace(
    "if (!success) {",
    "if (!cspResult.success) {"
);

// 4. Hook up calculatePenalty at the end
const oldHook = `  // Local Search Optimization
  const currentState = {
     generatedTimetables,
     facultySchedule,
     roomSchedule,
     batchUsedPeriodsMap,
     stats,
     dayLoad: {}
  };
  // To keep performance high on UI thread, we only run local search lightly
  // optimizeTimetableLocalSearch(currentState, unassignedVars);`;

const newHook = `  // Calculate Soft Constraints Penalty Score
  stats.penaltyScore = calculatePenalty(generatedTimetables, facultySchedule);
  
  // Note: Local Search structural mutations (swaps/moves) can be injected here 
  // by mutating generatedTimetables and checking if calculatePenalty() improves.`;

content = content.replace(oldHook, newHook);

fs.writeFileSync(path, content, 'utf8');
console.log('Cleanup complete');
