export function solveCSP(unassignedVars, stateFunctions, maxBacktracks = 10000) {
    let assignments = [];
    let backtracks = 0;

    function backtrack(vars) {
        if (vars.length === 0) return true;
        if (backtracks > maxBacktracks) return false;

        // Minimum Remaining Values (MRV) heuristic
        vars.sort((a, b) => a.domain.length - b.domain.length);
        
        let currentVar = vars[0];
        if (currentVar.domain.length === 0) {
            backtracks++;
            return false; // Domain wipeout
        }

        let remainingVars = vars.slice(1);

        for (let value of currentVar.domain) {
            // Apply assignment
            stateFunctions.assign(currentVar, value);
            assignments.push({ variable: currentVar, value });

            // Forward Checking: remove conflicting values from related variables' domains
            let domainsChanged = [];
            let valid = true;

            for (let otherVar of remainingVars) {
                let initialLength = otherVar.domain.length;
                
                // Filter otherVar domain based on new assignment
                // We actually filter by checking if it's still assignable in the new state
                let newDomain = otherVar.domain.filter(val => stateFunctions.canAssign(otherVar, val));
                
                if (newDomain.length === 0) {
                    valid = false;
                }
                
                if (newDomain.length !== initialLength) {
                    domainsChanged.push({ v: otherVar, oldDomain: otherVar.domain });
                    otherVar.domain = newDomain;
                }
            }

            if (valid) {
                let result = backtrack(remainingVars);
                if (result) return true;
            }

            // Backtrack: Restore domains
            for (let change of domainsChanged) {
                change.v.domain = change.oldDomain;
            }

            // Revert assignment
            assignments.pop();
            stateFunctions.unassign(currentVar, value);
            backtracks++;
            if (backtracks > maxBacktracks) return false;
        }

        return false;
    }

    let success = backtrack(unassignedVars);
    return { success, assignments, backtracks };
}
