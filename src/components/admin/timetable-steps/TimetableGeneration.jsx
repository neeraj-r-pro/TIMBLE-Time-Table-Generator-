import React, { useState } from 'react';
import {
  Wand2,
  Download,
  RefreshCw,
  Calendar,
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Eye,
  Loader2,
  Copy,
  X
} from 'lucide-react';
import './TimetableSteps.css';
import '../../student/StudentTimetableViewer.css';
import { timetablesAPI, schedulesAPI, subjectsAPI, batchesAPI, facultiesAPI, roomsAPI, timetableManagementAPI } from '../../../services/api';
import { generateTimetable } from '../../../utils/timetableGenerator';
import {
  computeTeachingContinuationFlags,
  mergedTimeLabelForRun,
} from '../../../utils/timetableDisplayUtils';

export function TimetableGeneration({ data, onComplete, onPrevious, isLastStep }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [timetableGenerated, setTimetableGenerated] = useState(false);
  const [generatedTimetables, setGeneratedTimetables] = useState({});
  const [selectedBatch, setSelectedBatch] = useState(data.batches?.[0]?.id || '');
  const [generationStats, setGenerationStats] = useState(null);
  const [timetableCode, setTimetableCode] = useState(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);

  const batches = data.batches || [];
  const subjects = data.subjects || {};
  const schedule = data.schedule || {};
  const generationConfig = data.generationConfig || {};
  const breakSettings = data.breakSettings || {};
  const facultyPrefsData = data.facultyPrefsData || {};

  const generateTimetableHandler = async () => {
    setIsGenerating(true);

    try {
      // Load faculties and rooms from database
      const [facultiesList, roomsList] = await Promise.all([
        facultiesAPI.getAll(),
        roomsAPI.getAll()
      ]);

      // Validate we have required data
      if (batches.length === 0) {
        alert('Please add at least one batch');
        setIsGenerating(false);
        return;
      }

      if (Object.keys(subjects).length === 0) {
        alert('Please add subjects to batches');
        setIsGenerating(false);
        return;
      }

      if (Object.keys(schedule).length === 0) {
        alert('Please define schedule timings');
        setIsGenerating(false);
        return;
      }

      // ── Build faculty-to-subject mapping from preferences ──────────────────
      // Faculty preferences store subject_slots like {theory1: subjectId, lab1: subjectId}
      // We need to reverse-map this so each session knows which faculty can teach it.
      const subjectToFacultyMap = new Map(); // subjectId → Set<facultyId>

      // 1. Map from faculty preferences (subjectSlots)
      const allFacultyPrefs = facultyPrefsData.facultyPreferences || {};
      for (const [facultyId, prefs] of Object.entries(allFacultyPrefs)) {
        const slots = prefs?.subjectSlots || {};
        for (const [, subjectId] of Object.entries(slots)) {
          if (subjectId) {
            if (!subjectToFacultyMap.has(subjectId)) {
              subjectToFacultyMap.set(subjectId, new Set());
            }
            subjectToFacultyMap.get(subjectId).add(facultyId);
          }
        }
      }

      // 2. Also load subjects from DB to get any faculty_id assigned at subject level
      let dbSubjects = [];
      try {
        const institutionId = data.basicInfo?.institutionId;
        if (institutionId) {
          dbSubjects = await subjectsAPI.getAll(null, institutionId);
        }
      } catch (e) {
        console.warn('Could not load DB subjects for faculty fallback:', e);
      }
      const dbSubjectMap = new Map((dbSubjects || []).map(s => [s.id, s]));

      // 3. Inject facultyIds onto each session/subject
      const enrichedSubjects = {};
      for (const [batchId, sessionList] of Object.entries(subjects)) {
        enrichedSubjects[batchId] = sessionList.map(session => {
          const facultyIdsSet = new Set();

          // Gather from preferences for each subjectId in this session
          for (const sid of (session.subjectIds || [])) {
            const prefsSet = subjectToFacultyMap.get(sid);
            if (prefsSet) {
              for (const fid of prefsSet) facultyIdsSet.add(fid);
            }
            // Fallback: use faculty_id from the DB subject record
            const dbSub = dbSubjectMap.get(sid);
            if (dbSub?.faculty_id) {
              facultyIdsSet.add(dbSub.faculty_id);
            }
          }

          // Also check old-style subject.subjectId
          if (session.subjectId) {
            const prefsSet = subjectToFacultyMap.get(session.subjectId);
            if (prefsSet) {
              for (const fid of prefsSet) facultyIdsSet.add(fid);
            }
            const dbSub = dbSubjectMap.get(session.subjectId);
            if (dbSub?.faculty_id) {
              facultyIdsSet.add(dbSub.faculty_id);
            }
          }

          return {
            ...session,
            subjectId: session.subjectIds?.[0] || session.subjectId,
            facultyIds: Array.from(facultyIdsSet),
          };
        });
      }

      // Generate timetable using the algorithm (randomized CSP).
      // We try a few times and keep the "best" result to get a more optimized, less repetitive timetable.
      const generationAttempts = 3;
      let bestGenerated = null;
      let bestStats = null;
      let bestTimeMs = 0;

      for (let attempt = 0; attempt < generationAttempts; attempt++) {
        const startTime = performance.now();
        const { generatedTimetables: generatedAttempt, stats: statsAttempt } = generateTimetable(
          batches,
          enrichedSubjects,
          schedule,
          facultiesList,
          roomsList,
          {
            facultyPreferences: facultyPrefsData.facultyPreferences || {},
            allowFacultyPreferences: generationConfig.allowFacultyPreferences !== false,
            scheduleList: data.scheduleList || null
          }
        );
        const endTime = performance.now();

        const roomUtilVal =
          typeof statsAttempt?.roomUtilization === 'number'
            ? statsAttempt.roomUtilization
            : -1;

        const bestRoomUtilVal =
          typeof bestStats?.roomUtilization === 'number'
            ? bestStats.roomUtilization
            : -1;

        if (
          !bestStats ||
          statsAttempt.conflicts < bestStats.conflicts ||
          (statsAttempt.conflicts === bestStats.conflicts && roomUtilVal > bestRoomUtilVal)
        ) {
          bestGenerated = generatedAttempt;
          bestStats = statsAttempt;
          bestTimeMs = endTime - startTime;
        }
      }

      const generationTime = ((bestTimeMs || 0) / 1000).toFixed(2) + 's';
      const generated = bestGenerated || {};
      const stats = bestStats || { conflicts: 0, conflictDetails: [], roomUtilization: 'N/A', facultyLoad: {} };

      const loadValues = Object.values(stats.facultyLoad || {});
      const avgLoad = loadValues.length > 0
        ? loadValues.reduce((a, b) => a + b, 0) / loadValues.length
        : 0;

      // Calculate total classes from generated timetables
      const totalClasses = Object.values(generated).reduce((total, batchTt) => {
        return total + Object.values(batchTt).reduce((dayTotal, dayEntries) => {
          return dayTotal + dayEntries.filter(e => e.type !== 'break' && e.type !== 'lunch' && e.type !== 'assembly').length;
        }, 0);
      }, 0);

      setGeneratedTimetables(generated);
      setGenerationStats({
        totalClasses,
        conflicts: stats.conflicts,
        conflictDetails: stats.conflictDetails || [],
        roomUtilization: stats.roomUtilization,
        facultyLoad: avgLoad > 0 ? `${avgLoad.toFixed(1)} periods/avg` : 'No classes',
        generationTime: generationTime
      });

      setTimetableGenerated(true);
    } catch (error) {
      console.error('Error generating timetable:', error);
      alert('Failed to generate timetable: ' + (error.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setTimetableGenerated(false);
    setGeneratedTimetables({});
    setGenerationStats(null);
    generateTimetableHandler();
  };

  const exportTimetable = (format) => {
    if (format === 'IMAGE') {
      try {
        if (!selectedBatch || !generatedTimetables[selectedBatch]) {
          alert('No timetable data available to export');
          return;
        }

        const batchName = batches.find(b => String(b.id) === String(selectedBatch))?.name || selectedBatch;
        const batchTt = generatedTimetables[selectedBatch];

        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const timeSlots = Array.from(
          new Set(Object.values(batchTt).flatMap(periods => (periods || []).map(p => p.time)))
        ).sort();

        if (timeSlots.length === 0) {
          alert('No timetable slots found to export');
          return;
        }

        const padding = 24;
        const dayColW = 140;
        const slotW = Math.max(110, Math.floor(1100 / timeSlots.length));
        const cellH = 62;
        const titleH = 56;
        const headerH = 46;

        const canvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor((padding * 2 + dayColW + timeSlots.length * slotW) * dpr);
        canvas.height = Math.floor((padding * 2 + titleH + headerH + dayOrder.length * cellH) * dpr);

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
        // Empty top-left header cell
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
        dayOrder.forEach((day, rowIdx) => {
          const y = gridY + headerH + rowIdx * cellH;
          const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);

          // Day column
          ctx.strokeRect(gridX, y, dayColW, cellH);
          ctx.fillStyle = '#111827';
          ctx.fillText(dayLabel, gridX + 8, y + cellH / 2 + 5);

          const dayPeriods = batchTt[day] || [];
          timeSlots.forEach((slot, colIdx) => {
            const x = gridX + dayColW + colIdx * slotW;
            ctx.strokeRect(x, y, slotW, cellH);

            const period = dayPeriods.find(p => p.time === slot);
            const label = period?.subject ? String(period.subject) : '-';

            // Truncate to fit
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
    } else if (format === 'CSV' || format === 'Excel') {
      const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const rows = [];

      Object.entries(generatedTimetables).forEach(([batchId, batchTt]) => {
        const batch = batches.find(b => b.id === batchId);
        rows.push([`Batch: ${batch?.name || batchId}`]);

        // Get all unique time slots for this batch to use as headers
        const timeSlots = Array.from(new Set(
          Object.values(batchTt).flatMap(periods => periods.map(p => p.time))
        )).sort();

        rows.push(['Day', ...timeSlots]);

        dayOrder.forEach(day => {
          const dayPeriods = batchTt[day] || [];
          if (dayPeriods.length === 0) return;

          const row = [day.charAt(0).toUpperCase() + day.slice(1)];
          timeSlots.forEach(slot => {
            const period = dayPeriods.find(p => p.time === slot);
            if (period) {
              const fac = period.facultyAll || period.faculty;
              row.push(`${period.subject} (${fac}) @ ${period.room}`);
            } else {
              row.push('-');
            }
          });
          rows.push(row);
        });
        rows.push([]); // Empty row between batches
      });

      const csvContent = "data:text/csv;charset=utf-8,"
        + rows.map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `timetable_${timetableCode || 'export'}.${format === 'CSV' ? 'csv' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'PDF') {
      window.print();
    }
  };

  const handleFinish = async () => {
    if (!timetableGenerated) {
      alert('Please generate the timetable before finishing');
      return;
    }

    try {
      setIsGenerating(true);

      // Use existing timetable if code was generated in BasicInfo step (TimetableMaster-style)
      let timetableId = data.basicInfo?.timetableId;
      let code = data.basicInfo?.timetableCode;

      if (!timetableId) {
        const timetableName = data.basicInfo?.institutionName
          ? `${data.basicInfo.institutionName} - ${new Date().getFullYear()}`
          : `Timetable - ${new Date().toLocaleDateString()}`;

        const timetableRecord = await timetableManagementAPI.create({
          name: timetableName,
          academicYear: data.basicInfo?.academicYear || null,
          semester: data.basicInfo?.semester || null,
          description: `Timetable for ${data.batches?.length || 0} batches`
        });

        timetableId = timetableRecord.id;
        code = timetableRecord.code;
      }

      setTimetableCode(code);
      const institutionId = data.basicInfo?.institutionId;

      // Update the timetable record with the configuration so it persists
      await timetableManagementAPI.update(timetableId, {
        config: {
          scheduleList: data.scheduleList || null,
          schedule: data.schedule || null,
          breakSettings: data.breakSettings || {}
        }
      });

      // --- PRE-VALIDATION AND BUILD PHASE ---
      
      // 1. Build schedules
      const allSchedules = [];
      Object.entries(data.schedule || {}).forEach(([day, periods]) => {
        periods.forEach(period => {
          allSchedules.push({
            dayOfWeek: day,
            periodName: period.name,
            startTime: period.startTime,
            endTime: period.endTime,
            type: period.type,
            institutionId: institutionId,
            timetableId: timetableId
          });
        });
      });

      // 2. Build timetable entries and validate
      const allTimetableEntries = [];
      const validationErrors = [];

      // Get all faculties and rooms for fallback lookup AND validation
      const [facultiesList, roomsList] = await Promise.all([
        facultiesAPI.getAll(),
        roomsAPI.getAll()
      ]);
      const facultyMap = new Map(facultiesList.map(f => [f.name, f.id]));
      const roomMap = new Map(roomsList.map(r => [r.name, r.id]));
      const facultyIdMap = new Map(facultiesList.map(f => [String(f.id), f.id]));
      const roomIdMap = new Map(roomsList.map(r => [String(r.id), r.id]));
      
      // Validation sets — only IDs that actually exist in the DB right now
      const validFacultyIds = new Set(facultiesList.map(f => String(f.id)));
      const validRoomIds = new Set(roomsList.map(r => String(r.id)));

      for (const [batchId, batchTimetable] of Object.entries(generatedTimetables)) {
        // `generatedTimetables` keys are stringified (Object.entries), so compare robustly.
        const batch = data.batches.find(b => String(b.id) === String(batchId));
        if (!batch) {
          validationErrors.push(`Batch ID ${batchId} not found in current batches.`);
          continue;
        }

        // Build a name→subjectId map as fallback
        const batchSubjects = data.subjects[batchId] || [];
        const subjectNameMap = new Map(batchSubjects.map(s => [s.name, s.subjectId || s.id]));

        for (const [day, periods] of Object.entries(batchTimetable)) {
          let periodNumber = 1;

          for (const period of periods) {
            // Skip breaks and lunch
            if (period.type === 'break' || period.type === 'lunch' || period.type === 'assembly') {
              continue;
            }

            // Use embedded IDs only if they exist in the current database, otherwise name-lookup
            const subjectId = period._subjectId || subjectNameMap.get(period.subject) || null;

            let facultyId = null;
            if (period._facultyId != null && validFacultyIds.has(String(period._facultyId))) {
              facultyId = facultyIdMap.get(String(period._facultyId));
            } else {
              facultyId = facultyMap.get(period.faculty) || null;
            }

            let roomId = null;
            if (period._roomId != null && validRoomIds.has(String(period._roomId))) {
              roomId = roomIdMap.get(String(period._roomId));
            } else {
              roomId = roomMap.get(period.room) || null;
            }

            // Check for missing mappings
            if (!subjectId) {
              validationErrors.push(`Batch "${batch.name}": Subject "${period.subject}" lacks a valid database ID.`);
            }
            if (!facultyId) {
              validationErrors.push(`Batch "${batch.name}": Faculty "${period.faculty}" for subject "${period.subject}" lacks a valid database ID.`);
            }

            // Parse time (format: "9:00-10:00" -> "09:00:00" and "10:00:00")
            const timeParts = period.time.split('-').map(t => t.trim());
            if (timeParts.length !== 2) {
              validationErrors.push(`Batch "${batch.name}": Invalid time format "${period.time}".`);
              continue;
            }

            // Only proceed if there are no errors yet, to avoid building bad data
            if (validationErrors.length === 0) {
              const startTime = timeParts[0].includes(':')
                ? (timeParts[0].split(':').length === 2 ? timeParts[0] + ':00' : timeParts[0])
                : timeParts[0] + ':00:00';
              const endTime = timeParts[1].includes(':')
                ? (timeParts[1].split(':').length === 2 ? timeParts[1] + ':00' : timeParts[1])
                : timeParts[1] + ':00:00';

              allTimetableEntries.push({
                timetableId: timetableId,
                batchId: batch.id,
                subjectId: subjectId,
                facultyId: facultyId,
                roomId: roomId,
                dayOfWeek: day,
                periodNumber: periodNumber++,
                startTime: startTime,
                endTime: endTime,
                academicYear: data.basicInfo?.academicYear || null,
                semester: data.basicInfo?.semester || null
              });
            }
          }
        }
      }

      // If we found any mapping errors, abort BEFORE deleting old data
      if (validationErrors.length > 0) {
        alert('Validation failed before saving:\n\n' + validationErrors.join('\n') + '\n\nPlease ensure all subjects and faculties are properly assigned in previous steps.');
        setIsGenerating(false);
        return;
      }

      // --- EXECUTION PHASE ---

      // 3. CLEANUP OLD DATA for this timetable (replace on re-save)
      await Promise.all([
        timetablesAPI.deleteEntries(timetableId).catch((e) => {
          console.warn('deleteEntries:', e);
          throw e;
        }),
        schedulesAPI.deleteByTimetable(timetableId).catch((e) => {
          console.warn('deleteByTimetable:', e);
          throw e;
        }),
      ]);

      // 4. Save schedules
      if (allSchedules.length > 0) {
        await schedulesAPI.create(allSchedules);
      }

      // 5. Save all timetable entries in bulk
      if (allTimetableEntries.length > 0) {
        await timetablesAPI.createBulk(allTimetableEntries);
      }

      const finalData = {
        ...data,
        generatedTimetables,
        generationStats,
        timetableId,
        timetableCode: code,
        completedAt: Date.now()
      };

      // Show code modal
      setShowCodeModal(true);
    } catch (err) {
      console.error('Error saving timetable:', err);
      alert('Failed to save timetable: ' + (err.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCodeModalClose = () => {
    setShowCodeModal(false);
    onComplete({
      ...data,
      generatedTimetables,
      generationStats,
      timetableCode,
      completedAt: Date.now()
    });
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(timetableCode);
    alert('Code copied to clipboard!');
  };

  const getSelectedBatch = () => {
    return batches.find(batch => batch.id === selectedBatch);
  };

  const getBatchSubjects = (batchId) => {
    return subjects[batchId] || [];
  };

  const getTotalPeriods = () => {
    return Object.values(schedule).reduce((total, daySchedule) =>
      total + (daySchedule?.filter(p => p.type === 'class').length || 0), 0
    );
  };

  return (
    <div className="timetable-step">
      <div className="step-header">
        <div className="step-icon-wrapper">
          <Wand2 className="step-main-icon" />
        </div>
        <div className="step-title-section">
          <h2>Generate Timetable</h2>
          <p>Create optimized timetables with all your configurations</p>
        </div>
      </div>

      <div className="timetable-generation-content">
        {/* Pre-Generation Summary */}
        {!timetableGenerated && (
          <div className="generation-summary">
            <h3>Generation Summary</h3>
            <div className="summary-grid">
              <div className="summary-card">
                <Users className="summary-icon" />
                <div>
                  <h4>Batches</h4>
                  <span className="summary-value">{batches.length}</span>
                </div>
              </div>

              <div className="summary-card">
                <BookOpen className="summary-icon" />
                <div>
                  <h4>Total Subjects</h4>
                  <span className="summary-value">
                    {Object.values(subjects).reduce((total, batchSubjects) => total + batchSubjects.length, 0)}
                  </span>
                </div>
              </div>

              <div className="summary-card">
                <Clock className="summary-icon" />
                <div>
                  <h4>Class Periods</h4>
                  <span className="summary-value">{getTotalPeriods()}</span>
                </div>
              </div>

              <div className="summary-card">
                <Calendar className="summary-icon" />
                <div>
                  <h4>Working Days</h4>
                  <span className="summary-value">
                    {Object.values(schedule).filter(daySchedule => daySchedule && daySchedule.length > 0).length}
                  </span>
                </div>
              </div>
            </div>

            <div className="generation-checklist">
              <h4>Pre-generation Checklist</h4>
              <div className="checklist-items">
                <div className="checklist-item">
                  <CheckCircle className="check-icon" />
                  <span>Institution details configured</span>
                </div>
                <div className="checklist-item">
                  <CheckCircle className="check-icon" />
                  <span>{batches.length} batches created</span>
                </div>
                <div className="checklist-item">
                  <CheckCircle className="check-icon" />
                  <span>Subjects assigned to all batches</span>
                </div>
                <div className="checklist-item">
                  <CheckCircle className="check-icon" />
                  <span>Schedule timings defined</span>
                </div>
              </div>
            </div>

            <div className="constraints-info">
              <h4>Generation Constraints</h4>
              <div className="constraints-grid">
                <div className="constraint-item">
                  <AlertTriangle className="constraint-icon" />
                  <div>
                    <h5>Multi-period Subjects</h5>
                    <p>Lab subjects requiring consecutive periods will be scheduled together</p>
                  </div>
                </div>
                <div className="constraint-item">
                  <AlertTriangle className="constraint-icon" />
                  <div>
                    <h5>Faculty Conflicts</h5>
                    <p>No faculty will be assigned to multiple classes simultaneously</p>
                  </div>
                </div>
                <div className="constraint-item">
                  <AlertTriangle className="constraint-icon" />
                  <div>
                    <h5>Room Allocation</h5>
                    <p>Optimal room utilization based on class sizes and lab requirements</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="generation-controls">
              <button
                className="btn btn-primary btn-generate"
                onClick={generateTimetableHandler}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className={`btn-icon ${isGenerating ? 'spin' : ''}`} />
                    Generating Timetable...
                  </>
                ) : (
                  <>
                    <Wand2 className="btn-icon" />
                    Generate Timetable
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Post-Generation Results */}
        {timetableGenerated && (
          <div className="generation-results">
            <div className="success-banner">
              <CheckCircle className="success-icon" />
              <div>
                <h3>Timetable Generated Successfully!</h3>
                <p>Your optimized timetables are ready for all batches</p>
              </div>
            </div>

            {/* Generation Statistics */}
            {generationStats && (
              <div className="generation-stats">
                <h4>Generation Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-label">Total Classes</div>
                    <div className="stat-value">{generationStats.totalClasses}</div>
                  </div>
                  <div
                    className={`stat-item ${generationStats.conflicts > 0 ? 'stat-clickable' : ''}`}
                    onClick={() => generationStats.conflicts > 0 && setShowConflicts(true)}
                    title={generationStats.conflicts > 0 ? 'Click to view conflict details' : ''}
                    style={generationStats.conflicts > 0 ? { cursor: 'pointer' } : {}}
                  >
                    <div className="stat-label">Conflicts {generationStats.conflicts > 0 && <span style={{ fontSize: '0.7em', opacity: 0.7 }}>▸ click</span>}</div>
                    <div className={`stat-value ${generationStats.conflicts === 0 ? 'conflicts-zero' : 'conflicts-nonzero'}`}>{generationStats.conflicts}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Room Utilization</div>
                    <div className="stat-value">{generationStats.roomUtilization === 'N/A' ? 'N/A' : `${generationStats.roomUtilization}%`}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Faculty Load</div>
                    <div className="stat-value">{generationStats.facultyLoad}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">Generation Time</div>
                    <div className="stat-value">{generationStats.generationTime}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Batch Selection for Preview */}
            <div className="timetable-preview-section">
              <div className="section-header">
                <h4>Preview Timetable</h4>
                <div className="preview-controls">
                  <select
                    className="batch-selector"
                    value={selectedBatch}
                    onChange={(e) => {
                      setSelectedBatch(e.target.value);
                      setShowExportMenu(false);
                    }}
                  >
                    {batches.map(batch => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} ({batch.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Timetable Preview */}
              {generatedTimetables[selectedBatch] && (() => {
                const batchTt = generatedTimetables[selectedBatch];
                const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const timeSlots = Array.from(new Set(
                  Object.values(batchTt).flatMap(periods => periods.map(p => p.time))
                )).sort();

                return (
                  <div className="student-timetable-content" style={{ padding: 0 }}>
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
                        {dayOrder.map(day => {
                          const dayPeriods = batchTt[day] || [];
                          if (dayPeriods.length === 0) return null;

                          const { skip } = computeTeachingContinuationFlags(dayPeriods, timeSlots);
                          const mergeRunLen = (start) => {
                            if (skip[start]) return 0;
                            let n = 1;
                            for (let k = start + 1; k < timeSlots.length && skip[k]; k++) n++;
                            return n;
                          };

                          return (
                            <tr key={day} className="student-timetable-row">
                              <th className="student-time-cell" scope="row">
                                {day.charAt(0).toUpperCase() + day.slice(1)}
                              </th>
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
                                const period = dayPeriods.find(p => p.time === timeSlot);
                                const runLen = mergeRunLen(colIdx);
                                const timeLabel = runLen > 1
                                  ? mergedTimeLabelForRun(dayPeriods, timeSlots, colIdx, skip)
                                  : null;

                                return (
                                  <td
                                    key={`${day}-${timeSlot}`}
                                    className={`student-schedule-cell${runLen > 1 ? ' slot-merged-start' : ''}`}
                                  >
                                    {period ? (
                                      <div className={`student-schedule-item ${period.type || ''}`}>
                                        {timeLabel && (
                                          <div className="student-teacher" style={{ fontWeight: 600, color: '#0369a1' }}>
                                            {timeLabel}
                                          </div>
                                        )}
                                        <div className="student-subject">{period.subject}</div>
                                        <div className="student-teacher">{period.facultyAll || period.faculty}</div>
                                        <div className="student-room">{period.room}</div>
                                        {period.type && (
                                          <div className={`student-type ${String(period.type).toLowerCase()}`}>
                                            {period.type}
                                          </div>
                                        )}
                                      </div>
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
              })()}
            </div>

            {/* Action Buttons */}
            <div className="generation-actions">
              <div className="action-group">
                <button
                  className="btn btn-secondary"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                >
                  <RefreshCw className={`btn-icon ${isGenerating ? 'spin' : ''}`} />
                  Regenerate
                </button>

                <div className="export-dropdown">
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                  >
                    <Download className="btn-icon" />
                    Export
                  </button>
                  {showExportMenu && (
                    <div className="export-options show">
                      <button onClick={() => { exportTimetable('IMAGE'); setShowExportMenu(false); }}>Export as Image (PNG)</button>
                      <button onClick={() => { exportTimetable('PDF'); setShowExportMenu(false); }}>Export as PDF</button>
                      <button onClick={() => { exportTimetable('Excel'); setShowExportMenu(false); }}>Export as Excel</button>
                      <button onClick={() => { exportTimetable('CSV'); setShowExportMenu(false); }}>Export as CSV</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="step-actions">
        <button className="btn btn-secondary" onClick={onPrevious}>
          <ArrowLeft className="btn-icon-left" />
          Previous
        </button>

        {timetableGenerated ? (
          <button
            className="btn btn-primary"
            onClick={handleFinish}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="btn-icon spinner" />
                Saving to Database...
              </>
            ) : (
              <>
                <CheckCircle className="btn-icon" />
                Complete Setup
              </>
            )}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            disabled
          >
            Generate timetable first
          </button>
        )}
      </div>

      {/* Code Display Modal */}
      {showCodeModal && timetableCode && (
        <div className="modal-overlay" onClick={handleCodeModalClose}>
          <div className="modal-content code-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Timetable Created Successfully!</h2>
              <button className="modal-close" onClick={handleCodeModalClose}>
                <X className="icon-sm" />
              </button>
            </div>
            <div className="code-display-section">
              <p className="code-instruction">
                Your timetable has been created. Share this code with students and faculty:
              </p>
              <div className="code-box">
                <div className="code-value">{timetableCode}</div>
                <button
                  className="btn btn-secondary btn-copy"
                  onClick={copyCodeToClipboard}
                >
                  <Copy className="btn-icon" />
                  Copy Code
                </button>
              </div>
              <div className="code-usage-info">
                <h4>How to use this code:</h4>
                <ul>
                  <li><strong>Students:</strong> Use this code to login and view their timetable</li>
                  <li><strong>Faculty:</strong> Enter this code after login to select this timetable</li>
                </ul>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleCodeModalClose}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Details Modal */}
      {showConflicts && generationStats?.conflictDetails?.length > 0 && (
        <div className="modal-overlay" onClick={() => setShowConflicts(false)}>
          <div className="modal-content code-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h2>Conflict Details ({generationStats.conflictDetails.length})</h2>
              <button className="modal-close" onClick={() => setShowConflicts(false)}>
                <X className="icon-sm" />
              </button>
            </div>
            <div style={{ padding: '1.25rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ marginBottom: '1rem', opacity: 0.8, fontSize: '0.9rem' }}>
                The following sessions could not be placed because all available time slots were occupied by other classes, faculties, or rooms.
              </p>
              {generationStats.conflictDetails.map((c, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255,100,100,0.08)',
                  border: '1px solid rgba(255,100,100,0.25)',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  marginBottom: '0.65rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{c.subjectName}</strong>
                    <span style={{ fontSize: '0.78rem', opacity: 0.7, background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                      {c.consecutivePeriods > 1 ? `${c.consecutivePeriods} consecutive periods` : '1 period'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', opacity: 0.75, marginBottom: '0.25rem' }}>Batch: {c.batchName}</div>
                  <div style={{ fontSize: '0.82rem', opacity: 0.65 }}>{c.reason}</div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowConflicts(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}