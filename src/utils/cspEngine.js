// Constraint Satisfaction Problem soft constraint scoring
export function calculatePenalty(generatedTimetables, facultySchedule) {
    let penalty = 0;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    // 1. Teacher idle gaps & Consecutive classes
    for (const schedule of facultySchedule.values()) {
        for (const day of days) {
            const periods = schedule[day] || [];
            if (periods.length <= 1) continue;
            
            const sortedPeriods = [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime));
            
            let consecutive = 1;
            for (let i = 1; i < sortedPeriods.length; i++) {
                const prev = sortedPeriods[i-1];
                const curr = sortedPeriods[i];
                
                if (prev.endTime === curr.startTime) {
                    consecutive++;
                    if (consecutive > 3) penalty += 10; 
                } else {
                    consecutive = 1;
                    penalty += 5; 
                }
            }
        }
    }

    // 2. Student consecutive classes & same subject per day distribution
    Object.values(generatedTimetables).forEach(batchSchedule => {
        for (const day of days) {
            const dayClasses = (batchSchedule[day] || []).filter(c => c.type !== 'break' && c.type !== 'lunch');
            if (dayClasses.length === 0) continue;

            const sorted = [...dayClasses].sort((a, b) => a.time.localeCompare(b.time));
            let consecutive = 1;
            const subjectCounts = {};
            
            sorted.forEach((cls, i) => {
                const subKey = cls._subjectId || cls.subject;
                subjectCounts[subKey] = (subjectCounts[subKey] || 0) + 1;
                if (subjectCounts[subKey] > cls.consecutivePeriods) {
                    penalty += 15;
                }

                if (i > 0) {
                    const prevEndTime = sorted[i-1].time.split('-')[1];
                    const currStartTime = cls.time.split('-')[0];
                    if (prevEndTime === currStartTime) {
                        consecutive++;
                        if (consecutive > 4) penalty += 8; 
                    } else {
                        consecutive = 1;
                    }
                }
            });
        }
    });

    return penalty;
}
