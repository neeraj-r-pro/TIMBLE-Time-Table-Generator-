import React, { useState } from 'react';
import {
  Settings,
  ArrowRight,
  ArrowLeft,
  Save,
  Info,
  Clock,
  Users,
  AlertTriangle
} from 'lucide-react';
import './TimetableSteps.css';

export function GenerationConfig({ data, onComplete, onNext, onPrevious, isFirstStep }) {
  const [config, setConfig] = useState(data.generationConfig || {
    algorithm: 'balanced',
    optimizationLevel: 'medium',
    maxRetries: 3,
    allowFacultyPreferences: true,
    prioritizeLabs: true,
    minimizeGaps: true,
    roomUtilizationTarget: 80,
    conflictResolution: 'strict'
  });

  const [errors, setErrors] = useState({});

  const algorithms = [
    { value: 'balanced', label: 'Balanced', description: 'Balances all constraints equally' },
    { value: 'faculty-first', label: 'Faculty-First', description: 'Prioritizes faculty preferences' },
    { value: 'room-optimized', label: 'Room-Optimized', description: 'Maximizes room utilization' },
    { value: 'gap-minimized', label: 'Gap-Minimized', description: 'Reduces gaps between classes' }
  ];

  const optimizationLevels = [
    { value: 'low', label: 'Low', description: 'Faster generation, basic optimization' },
    { value: 'medium', label: 'Medium', description: 'Balanced speed and quality' },
    { value: 'high', label: 'High', description: 'Slower but better optimization' }
  ];

  const conflictResolutions = [
    { value: 'strict', label: 'Strict', description: 'No conflicts allowed' },
    { value: 'flexible', label: 'Flexible', description: 'Allow minor conflicts if needed' },
    { value: 'auto', label: 'Auto-Resolve', description: 'Automatically resolve conflicts' }
  ];

  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!config.algorithm) {
      newErrors.algorithm = 'Please select a generation algorithm';
    }

    if (!config.optimizationLevel) {
      newErrors.optimizationLevel = 'Please select an optimization level';
    }

    if (config.roomUtilizationTarget < 0 || config.roomUtilizationTarget > 100) {
      newErrors.roomUtilizationTarget = 'Room utilization target must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onComplete(config);
    }
  };

  return (
    <div className="timetable-step">
      <div className="step-header">
        <div className="step-icon-wrapper">
          <Settings className="step-main-icon" />
        </div>
        <div className="step-title-section">
          <h2>Generation Configuration</h2>
          <p>Configure timetable generation module settings and preferences</p>
        </div>
      </div>

      <div className="generation-config-content">
        {/* Info Banner */}
        <div className="info-banner">
          <Info className="info-icon" />
          <div>
            <h4>Generation Module Settings</h4>
            <p>Configure how the timetable generation algorithm will work. These settings affect the optimization strategy and conflict resolution.</p>
          </div>
        </div>

        {/* Algorithm Selection */}
        <div className="config-section">
          <div className="section-header">
            <h3>Generation Algorithm</h3>
            <p>Choose the algorithm strategy for generating timetables</p>
          </div>
          <div className="algorithm-grid">
            {algorithms.map(algorithm => (
              <div
                key={algorithm.value}
                className={`algorithm-card ${config.algorithm === algorithm.value ? 'selected' : ''}`}
                onClick={() => handleInputChange('algorithm', algorithm.value)}
              >
                <input
                  type="radio"
                  name="algorithm"
                  value={algorithm.value}
                  checked={config.algorithm === algorithm.value}
                  onChange={() => handleInputChange('algorithm', algorithm.value)}
                />
                <div className="algorithm-content">
                  <h4>{algorithm.label}</h4>
                  <p>{algorithm.description}</p>
                </div>
              </div>
            ))}
          </div>
          {errors.algorithm && <span className="error-text">{errors.algorithm}</span>}
        </div>

        {/* Optimization Level */}
        <div className="config-section">
          <div className="section-header">
            <h3>Optimization Level</h3>
            <p>Balance between generation speed and timetable quality</p>
          </div>
          <div className="optimization-grid">
            {optimizationLevels.map(level => (
              <div
                key={level.value}
                className={`optimization-card ${config.optimizationLevel === level.value ? 'selected' : ''}`}
                onClick={() => handleInputChange('optimizationLevel', level.value)}
              >
                <input
                  type="radio"
                  name="optimizationLevel"
                  value={level.value}
                  checked={config.optimizationLevel === level.value}
                  onChange={() => handleInputChange('optimizationLevel', level.value)}
                />
                <div className="optimization-content">
                  <h4>{level.label}</h4>
                  <p>{level.description}</p>
                </div>
              </div>
            ))}
          </div>
          {errors.optimizationLevel && <span className="error-text">{errors.optimizationLevel}</span>}
        </div>

        {/* Advanced Settings */}
        <div className="config-section">
          <div className="section-header">
            <h3>Advanced Settings</h3>
            <p>Fine-tune generation parameters</p>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="maxRetries">Maximum Retry Attempts</label>
              <input
                type="number"
                id="maxRetries"
                className="form-input"
                min="1"
                max="10"
                value={config.maxRetries}
                onChange={(e) => handleInputChange('maxRetries', parseInt(e.target.value))}
              />
              <span className="form-hint">Number of times to retry if conflicts occur</span>
            </div>

            <div className="form-group">
              <label htmlFor="roomUtilizationTarget">Room Utilization Target (%)</label>
              <input
                type="number"
                id="roomUtilizationTarget"
                className={`form-input ${errors.roomUtilizationTarget ? 'error' : ''}`}
                min="0"
                max="100"
                value={config.roomUtilizationTarget}
                onChange={(e) => handleInputChange('roomUtilizationTarget', parseInt(e.target.value))}
              />
              {errors.roomUtilizationTarget && <span className="error-text">{errors.roomUtilizationTarget}</span>}
              <span className="form-hint">Target percentage for room utilization (0-100)</span>
            </div>

            <div className="form-group">
              <label htmlFor="conflictResolution">Conflict Resolution Strategy</label>
              <select
                id="conflictResolution"
                className="form-input"
                value={config.conflictResolution}
                onChange={(e) => handleInputChange('conflictResolution', e.target.value)}
              >
                {conflictResolutions.map(resolution => (
                  <option key={resolution.value} value={resolution.value}>
                    {resolution.label} - {resolution.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Generation Preferences */}
        <div className="config-section">
          <div className="section-header">
            <h3>Generation Preferences</h3>
            <p>Enable or disable specific optimization features</p>
          </div>
          <div className="preferences-grid">
            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.allowFacultyPreferences}
                  onChange={(e) => handleInputChange('allowFacultyPreferences', e.target.checked)}
                />
                <div className="checkbox-content">
                  <h4>Allow Faculty Preferences</h4>
                  <p>Consider faculty time preferences when generating timetables</p>
                </div>
              </label>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.prioritizeLabs}
                  onChange={(e) => handleInputChange('prioritizeLabs', e.target.checked)}
                />
                <div className="checkbox-content">
                  <h4>Prioritize Lab Sessions</h4>
                  <p>Schedule lab sessions before theory classes</p>
                </div>
              </label>
            </div>

            <div className="preference-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={config.minimizeGaps}
                  onChange={(e) => handleInputChange('minimizeGaps', e.target.checked)}
                />
                <div className="checkbox-content">
                  <h4>Minimize Gaps</h4>
                  <p>Reduce gaps between consecutive classes for the same batch</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="config-summary">
          <h4>Configuration Summary</h4>
          <div className="summary-list">
            <div className="summary-item">
              <span className="summary-label">Algorithm:</span>
              <span className="summary-value">{algorithms.find(a => a.value === config.algorithm)?.label}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Optimization:</span>
              <span className="summary-value">{optimizationLevels.find(l => l.value === config.optimizationLevel)?.label}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Max Retries:</span>
              <span className="summary-value">{config.maxRetries}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Room Utilization Target:</span>
              <span className="summary-value">{config.roomUtilizationTarget}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="step-actions">
        {!isFirstStep && (
          <button className="btn btn-secondary" onClick={onPrevious}>
            <ArrowLeft className="btn-icon-left" />
            Previous
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={handleSave}
        >
          Save & Continue
          <ArrowRight className="btn-icon-right" />
        </button>
      </div>
    </div>
  );
}

