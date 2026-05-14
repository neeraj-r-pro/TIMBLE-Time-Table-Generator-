import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Wand2,
  Download,
  RefreshCw,
  Info,
  ChevronRight,
  Check,
  Plus,
  Users,
  BookOpen,
  Settings,
  Play,
  Trash2,
  UserCog,
  Copy,
  Loader2,
  Layout
} from 'lucide-react';
import './GenerateTimetable.css';
import { timetableManagementAPI } from '../../services/api';
import { TimetableInstructions } from './timetable-steps/TimetableInstructions';
import { BasicInfoSetup } from './timetable-steps/BasicInfoSetup';
import { SubjectAssignment } from './timetable-steps/SubjectAssignment';
import { ScheduleTiming } from './timetable-steps/ScheduleTiming';
import { FacultyPreferencesStep } from './timetable-steps/FacultyPreferencesStep';
import { GenerationConfig } from './timetable-steps/GenerationConfig';
import { TimetableGeneration } from './timetable-steps/TimetableGeneration';
import { ManualTimetableEditor } from './timetable-steps/ManualTimetableEditor';

const STORAGE_KEY = 'timetable_generation_progress';

const STEPS = [
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'College details & timetable code (generated first)',
    icon: Settings,
    component: BasicInfoSetup
  },
  {
    id: 'instructions',
    title: 'Instructions',
    description: 'Important guidelines',
    icon: Info,
    component: TimetableInstructions
  },
  {
    id: 'faculty-preferences',
    title: 'Faculty Preferences',
    description: 'Configure & view faculty preferences',
    icon: UserCog,
    component: FacultyPreferencesStep
  },
  {
    id: 'schedule',
    title: 'Schedule Timing',
    description: 'Define periods & breaks',
    icon: Clock,
    component: ScheduleTiming
  },
  {
    id: 'subjects',
    title: 'Session Allocation',
    description: 'Configure sessions per batch',
    icon: BookOpen,
    component: SubjectAssignment
  },
  {
    id: 'generation-config',
    title: 'Generation Config',
    description: 'Configure generation module',
    icon: Settings,
    component: GenerationConfig
  },
  {
    id: 'generate',
    title: 'Generate Timetable',
    description: 'Create initial timetable',
    icon: Wand2,
    component: TimetableGeneration
  },
  {
    id: 'refine',
    title: 'Manual Refine',
    description: 'Drag & drop adjustments',
    icon: Layout,
    component: ManualTimetableEditor
  }
];

export function GenerateTimetable() {
  // Ensure the admin dashboard knows we're on the timetable tab
  useEffect(() => {
    try {
      localStorage.setItem('admin_active_tab', 'timetable');
    } catch (err) {
      console.error('Error setting active tab:', err);
    }
  }, []);

  // Load from localStorage on mount
  const loadSavedProgress = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          currentStep: parsed.currentStep || 0,
          completedSteps: new Set(parsed.completedSteps || []),
          timetableData: parsed.timetableData || {
            basicInfo: {},
            batches: [],
            subjects: {},
            schedule: {},
            breakSettings: {},
            generationConfig: {},
            facultyPreferences: {},
            facultyPrefsData: {}
          }
        };
      }
    } catch (err) {
      console.error('Error loading saved progress:', err);
    }
    return {
      currentStep: 0,
      completedSteps: new Set(),
      timetableData: {
        basicInfo: {},
        batches: [],
        subjects: {},
        schedule: {},
        breakSettings: {},
        generationConfig: {},
        facultyPreferences: {},
        facultyPrefsData: {}
      }
    };
  };

  const savedProgress = loadSavedProgress();
  const [currentStep, setCurrentStep] = useState(savedProgress.currentStep);
  const [completedSteps, setCompletedSteps] = useState(savedProgress.completedSteps);
  const [timetableData, setTimetableData] = useState(savedProgress.timetableData);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [loadCode, setLoadCode] = useState('');
  const [lastSynced, setLastSynced] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check for recent drafts on backend if localStorage is empty or old
  useEffect(() => {
    const checkBackendDraft = async () => {
      // Skip auto-restore if user recently cleared progress
      if (localStorage.getItem('timetable_progress_cleared')) return;

      const isInitialState = currentStep === 0 && completedSteps.size === 0 && Object.keys(timetableData.basicInfo || {}).length === 0;
      if (isInitialState) {
        try {
          setLoadingDraft(true);
          const institutionId = localStorage.getItem('admin_selected_institution_id');
          const timetables = await timetableManagementAPI.getAll({ institutionId });
          const draft = timetables.find(t => t.workflow_state && Object.keys(t.workflow_state).length > 0);

          if (draft && draft.workflow_state) {
            const ws = draft.workflow_state;
            if (window.confirm(`Found an existing draft "${draft.name}" from ${new Date(draft.updated_at).toLocaleString()}. Would you like to resume it?`)) {
              setDraftData(ws, draft);
            }
          }
        } catch (err) {
          console.error('Error checking for backend drafts:', err);
        } finally {
          setLoadingDraft(false);
        }
      }
    };
    checkBackendDraft();
  }, []);

  const setDraftData = (ws, record) => {
    setCurrentStep(ws.currentStep || 0);
    setCompletedSteps(new Set(ws.completedSteps || []));
    // Ensure the record's latest core info is merged if needed, but ws usually has it all
    const mergedData = {
      ...ws.timetableData,
      basicInfo: {
        ...(ws.timetableData?.basicInfo || {}),
        timetableId: record.id,
        timetableCode: record.code,
        timetableName: record.name,
        institutionId: record.institution_id
      }
    };
    setTimetableData(mergedData);
    setLastSynced(new Date());
  };

  const handleLoadByCode = async (e) => {
    e?.preventDefault();
    if (!loadCode.trim()) return;
    try {
      setLoadingDraft(true);
      const tt = await timetableManagementAPI.getByCodeFull(loadCode.trim());
      if (tt && tt.workflow_state) {
        setDraftData(tt.workflow_state, tt);
        setLoadCode('');
        alert(`Draft for "${tt.name}" loaded successfully.`);
      } else if (tt) {
        // Timetable exists but has no workflow state
        if (window.confirm(`Timetable "${tt.name}" found but has no active draft. Start a new draft using its settings?`)) {
          const initialData = {
            currentStep: 0,
            completedSteps: [],
            timetableData: {
              basicInfo: {
                timetableId: tt.id,
                timetableCode: tt.code,
                timetableName: tt.name,
                description: tt.description,
                academicYear: tt.academic_year,
                institutionId: tt.institution_id
              }
            }
          };
          setDraftData(initialData, tt);
        }
      } else {
        alert('Timetable not found with that code.');
      }
    } catch (err) {
      console.error('Error loading by code:', err);
      alert('Failed to load timetable. Check the code and try again.');
    } finally {
      setLoadingDraft(false);
    }
  };

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      // Clear the "progress cleared" flag since user has new progress
      if (currentStep > 0 || completedSteps.size > 0) {
        localStorage.removeItem('timetable_progress_cleared');
      }

      const toSave = {
        currentStep,
        completedSteps: Array.from(completedSteps),
        timetableData,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));

      // Also sync to backend if we have a timetable ID
      const ttId = timetableData.basicInfo?.timetableId;
      if (ttId) {
        setIsSyncing(true);
        // Strip large generated timetable data from workflow state to keep payload small
        const syncData = { ...timetableData };
        delete syncData.generatedTimetables;
        delete syncData.generationStats;

        timetableManagementAPI.update(ttId, {
          workflowState: {
            currentStep,
            completedSteps: Array.from(completedSteps),
            timetableData: syncData
          }
        }).then(() => {
          setLastSynced(new Date());
          setIsSyncing(false);
        }).catch(err => {
          console.error('Error syncing workflow state to backend:', err);
          setIsSyncing(false);
          // If the timetable ID is stale (404/500), don't keep retrying
          if (err.message?.includes('not found') || err.message?.includes('Failed to update')) {
            console.warn('Timetable ID may be stale, skipping further syncs for this ID');
          }
        });
      }
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  }, [currentStep, completedSteps, timetableData]);

  const clearSavedProgress = () => {
    if (window.confirm('Are you sure you want to clear all saved progress? This action cannot be undone.')) {
      // Set flag to prevent auto-restore from backend on next load
      localStorage.setItem('timetable_progress_cleared', 'true');
      localStorage.removeItem(STORAGE_KEY);

      // Also clear backend workflow_state so it doesn't auto-restore
      const ttId = timetableData.basicInfo?.timetableId;
      if (ttId) {
        timetableManagementAPI.update(ttId, { workflowState: null }).catch(err => {
          console.warn('Failed to clear backend workflow state:', err);
        });
      }

      setCurrentStep(0);
      setCompletedSteps(new Set());
      setTimetableData({
        basicInfo: {},
        batches: [],
        subjects: {},
        schedule: {},
        breakSettings: {},
        generationConfig: {},
        facultyPreferences: {},
        facultyPrefsData: {}
      });
    }
  };

  // Convert step ID to data key (e.g., 'basic-info' -> 'basicInfo')
  const stepIdToKey = (stepId) => {
    if (stepId === 'basic-info') return 'basicInfo';
    if (stepId === 'instructions') return 'instructions';
    if (stepId === 'generation-config') return 'generationConfig';
    if (stepId === 'faculty-preferences') return 'facultyPrefsData';
    return stepId;
  };

  const handleStepComplete = (stepId, data) => {
    try {
      console.log('Step completed:', stepId, 'Current step:', currentStep);

      const newCompletedSteps = new Set([...completedSteps, stepId]);
      setCompletedSteps(newCompletedSteps);

      const stepKey = stepIdToKey(stepId);

      // Handle schedule step - save config to timetable so faculty can see time slots
      if (stepId === 'schedule' && data.schedules) {
        const newTimetableData = {
          ...timetableData,
          schedule: data.schedules,
          breakSettings: data.breakSettings,
          scheduleList: data.scheduleList || null
        };
        setTimetableData(newTimetableData);
        const ttId = timetableData.basicInfo?.timetableId;
        if (ttId) {
          timetableManagementAPI.update(ttId, {
            config: {
              schedule: data.schedules,
              breakSettings: data.breakSettings
            }
          }).catch(console.error);
        }
      } else if (stepId === 'subjects' && data.subjects && data.batches) {
        const newTimetableData = {
          ...timetableData,
          subjects: data.subjects,
          batches: data.batches
        };
        setTimetableData(newTimetableData);
      } else if (stepId === 'generate') {
        const newTimetableData = {
          ...timetableData,
          ...data
        };
        setTimetableData(newTimetableData);
      } else {
        const newTimetableData = {
          ...timetableData,
          [stepKey]: data
        };
        setTimetableData(newTimetableData);
      }

      // Move to next step if not at the last step
      if (currentStep < STEPS.length - 1) {
        const nextStep = currentStep + 1;
        console.log('Moving to next step:', nextStep, STEPS[nextStep]?.title);
        setCurrentStep(nextStep);
      } else {
        console.log('Last step completed');
      }
    } catch (error) {
      console.error('Error in handleStepComplete:', error);
      alert('An error occurred while saving progress. Please try again.');
    }
  };

  // Handle intermediate data updates (for steps that update data without completing)
  const handleDataUpdate = (stepId, data) => {
    const stepKey = stepIdToKey(stepId);
    setTimetableData(prev => ({
      ...prev,
      [stepKey]: data
    }));
  };

  const handleStepChange = (stepIndex) => {
    // Allow going back to any step, or forward if previous steps are completed
    if (stepIndex <= currentStep || completedSteps.has(STEPS[stepIndex - 1]?.id)) {
      setCurrentStep(stepIndex);
    }
  };

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <div className="generate-timetable-workflow">
      <div className="page-header">
        <div>
          <h1>Generate Timetable</h1>
          <p className="page-subtitle">Create comprehensive timetables for your institution</p>
          {(currentStep > 0 || completedSteps.size > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isSyncing ? '#3b82f6' : '#10b981',
                animation: isSyncing ? 'pulse 1.5s infinite' : 'none'
              }} />
              <p style={{ fontSize: '0.875rem', color: isSyncing ? '#3b82f6' : '#10b981', margin: 0 }}>
                {isSyncing ? 'Syncing to cloud...' : lastSynced ? `Last synced: ${lastSynced.toLocaleTimeString()}` : 'Your progress is being saved automatically'}
              </p>
            </div>
          )}
        </div>

        {currentStep === 0 && completedSteps.size === 0 && (
          <form onSubmit={handleLoadByCode} className="load-code-form" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Enter Draft Code..."
              value={loadCode}
              onChange={(e) => setLoadCode(e.target.value.toUpperCase())}
              className="form-input"
              style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', width: '180px' }}
            />
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={loadingDraft || !loadCode.trim()}
              style={{ padding: '0.5rem 1rem' }}
            >
              {loadingDraft ? <Loader2 className="spinner" style={{ width: '1rem', height: '1rem' }} /> : 'Resume Draft'}
            </button>
          </form>
        )}
        {loadingDraft && (
          <div className="loading-draft-indicator" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', background: '#eff6ff', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
            <Loader2 className="spinner" style={{ width: '1rem', height: '1rem' }} />
            Checking for existing drafts...
          </div>
        )}
        {(currentStep > 0 || completedSteps.size > 0) && (
          <button
            onClick={clearSavedProgress}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Trash2 style={{ width: '1rem', height: '1rem' }} />
            Clear Progress
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="workflow-progress">
        <div className="steps-container">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = index === currentStep;
            const isAccessible = index <= currentStep || completedSteps.has(STEPS[index - 1]?.id);

            return (
              <div
                key={step.id}
                className={`progress-step ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''} ${isAccessible ? 'accessible' : 'locked'}`}
                onClick={() => isAccessible && handleStepChange(index)}
              >
                <div className="step-indicator">
                  {isCompleted ? (
                    <Check className="step-icon" />
                  ) : (
                    <StepIcon className="step-icon" />
                  )}
                </div>
                <div className="step-info">
                  <div className="step-title">{step.title}</div>
                  <div className="step-description">{step.description}</div>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="step-arrow" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Step Content */}
      <div className="step-content">
        <CurrentStepComponent
          data={timetableData}
          onComplete={(data) => {
            try {
              const stepId = STEPS[currentStep]?.id;
              if (!stepId) {
                console.error('Invalid step index:', currentStep);
                return;
              }
              handleStepComplete(stepId, data);
              // Clear saved data when final step is completed
              if (currentStep === STEPS.length - 1) {
                localStorage.removeItem(STORAGE_KEY);
              }
            } catch (error) {
              console.error('Error in onComplete callback:', error);
              alert('An error occurred. Please try again.');
            }
          }}
          onDataUpdate={(data) => handleDataUpdate(STEPS[currentStep].id, data)}
          onNext={() => currentStep < STEPS.length - 1 && setCurrentStep(currentStep + 1)}
          onPrevious={() => currentStep > 0 && setCurrentStep(currentStep - 1)}
          isLastStep={currentStep === STEPS.length - 1}
          isFirstStep={currentStep === 0}
        />
      </div>
    </div>
  );
}
