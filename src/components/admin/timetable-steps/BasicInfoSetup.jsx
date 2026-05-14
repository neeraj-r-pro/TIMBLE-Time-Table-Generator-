import React, { useState, useEffect } from 'react';
import {
  Settings,
  Calendar,
  Building,
  FileText,
  ArrowRight,
  ArrowLeft,
  Save,
  Loader2,
  Copy
} from 'lucide-react';
import './TimetableSteps.css';
import { timetableManagementAPI, institutionsAPI, semestersAPI } from '../../../services/api';

export function BasicInfoSetup({ data, onComplete, onNext, onPrevious, isFirstStep, onDataUpdate }) {
  const [institutions, setInstitutions] = useState([]);
  const [formData, setFormData] = useState({
    institutionId: data.basicInfo?.institutionId || '',
    semesterId: data.basicInfo?.semesterId || '',
    timetableName: data.basicInfo?.timetableName || data.basicInfo?.institutionName || '',
    description: data.basicInfo?.description || '',
    academicYear: data.basicInfo?.academicYear || '',
    startDate: data.basicInfo?.startDate || '',
    endDate: data.basicInfo?.endDate || '',
    timezone: data.basicInfo?.timezone || 'UTC+05:30'
  });

  const [semesters, setSemesters] = useState([]);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [timetableCode, setTimetableCode] = useState(data.basicInfo?.timetableCode || null);
  const [timetableId, setTimetableId] = useState(data.basicInfo?.timetableId || null);

  useEffect(() => {
    institutionsAPI.getAll().then(setInstitutions).catch(console.error);
  }, []);

  // Load semesters when institution changes
  useEffect(() => {
    if (formData.institutionId) {
      semestersAPI.getAll(formData.institutionId)
        .then(data => setSemesters(data || []))
        .catch(console.error);
    } else {
      setSemesters([]);
    }
  }, [formData.institutionId]);

  // Generate timetable code as soon as creator starts - create timetable on mount
  React.useEffect(() => {
    if (data.basicInfo?.timetableId || creating) return;
    let cancelled = false;
    setCreating(true);
    const storedInstitutionId = localStorage.getItem('admin_selected_institution_id') || undefined;
    timetableManagementAPI.create({
      name: `Timetable - ${new Date().toLocaleDateString()}`,
      academicYear: null,
      semester: null,
      description: 'In progress',
      institutionId: storedInstitutionId
    }).then(record => {
      if (cancelled) return;
      setTimetableId(record.id);
      setTimetableCode(record.code);
      if (storedInstitutionId) {
        setFormData(prev => ({ ...prev, institutionId: prev.institutionId || storedInstitutionId }));
      }
      onDataUpdate?.({ ...data.basicInfo, timetableId: record.id, timetableCode: record.code });
    }).catch(err => {
      if (cancelled) return;
      console.error('Failed to create timetable:', err);
      setCreating(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.institutionId) {
      newErrors.institutionId = 'Institution is required';
    }
    if (!formData.timetableName.trim()) {
      newErrors.timetableName = 'Timetable name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.academicYear.trim()) {
      newErrors.academicYear = 'Academic year is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setErrors({});
    try {
      const timetableName = formData.timetableName
        ? formData.timetableName
        : `Timetable - ${new Date().toLocaleDateString()}`;

      let record = { id: timetableId, code: timetableCode };

      if (!timetableId) {
        // No timetable yet – create fresh
        record = await timetableManagementAPI.create({
          name: timetableName,
          academicYear: formData.academicYear || null,
          semester: null,
          description: formData.description || `Timetable for ${formData.academicYear}`,
          institutionId: formData.institutionId || undefined
        });
        setTimetableId(record.id);
        setTimetableCode(record.code);
      } else {
        // Update existing timetable with user-provided details
        try {
          await timetableManagementAPI.update(timetableId, {
            name: timetableName,
            academicYear: formData.academicYear || null,
            semester: null,
            description: formData.description || `Timetable for ${formData.academicYear}`,
            institutionId: formData.institutionId || undefined
          });
        } catch (updateErr) {
          // If update fails (e.g. stale ID from old session), create a new timetable instead
          console.warn('Update failed, creating new timetable instead:', updateErr.message);
          record = await timetableManagementAPI.create({
            name: timetableName,
            academicYear: formData.academicYear || null,
            semester: null,
            description: formData.description || `Timetable for ${formData.academicYear}`,
            institutionId: formData.institutionId || undefined
          });
          setTimetableId(record.id);
          setTimetableCode(record.code);
        }
      }

      onComplete({
        ...formData,
        institutionId: formData.institutionId,
        timetableName: formData.timetableName,
        timetableId: record.id,
        timetableCode: record.code
      });
    } catch (err) {
      console.error('Error saving timetable:', err);
      setErrors({ submit: err.message || 'Failed to save timetable. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const copyCodeToClipboard = () => {
    if (timetableCode) {
      navigator.clipboard.writeText(timetableCode);
      alert('Timetable code copied to clipboard!');
    }
  };

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getMinEndDate = () => {
    if (formData.startDate) {
      const startDate = new Date(formData.startDate);
      startDate.setDate(startDate.getDate() + 1);
      return startDate.toISOString().split('T')[0];
    }
    return getCurrentDate();
  };

  return (
    <div className="timetable-step">
      <div className="step-header">
        <div className="step-icon-wrapper">
          <Settings className="step-main-icon" />
        </div>
        <div className="step-title-section">
          <h2>Basic Information</h2>
          <p>Set up your institution details and timetable duration</p>
        </div>
      </div>

      <div className="basic-info-content">
        <div className="form-sections">
          {/* Timetable Details */}
          <div className="form-section">
            <div className="section-header">
              <Building className="section-icon" />
              <h3>Timetable Details</h3>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="institutionId">Institution *</label>
                <select
                  id="institutionId"
                  className={`form-input ${errors.institutionId ? 'error' : ''}`}
                  value={formData.institutionId}
                  onChange={(e) => handleInputChange('institutionId', e.target.value)}
                >
                  <option value="">Select Institution</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.code})
                    </option>
                  ))}
                </select>
                {errors.institutionId && <span className="error-text">{errors.institutionId}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="semesterId">Semester *</label>
                <select
                  id="semesterId"
                  className={`form-input ${errors.semesterId ? 'error' : ''}`}
                  value={formData.semesterId}
                  onChange={(e) => handleInputChange('semesterId', e.target.value)}
                  disabled={!formData.institutionId}
                >
                  <option value="">Select Semester</option>
                  {semesters.map((sem) => (
                    <option key={sem.id} value={sem.id}>
                      {sem.name}
                    </option>
                  ))}
                </select>
                {errors.semesterId && <span className="error-text">{errors.semesterId}</span>}
                {formData.institutionId && semesters.length === 0 && (
                  <span className="form-hint">No semesters found. Create one under Institution → Semesters first.</span>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="timetableName">Timetable Name *</label>
                <input
                  type="text"
                  id="timetableName"
                  className={`form-input ${errors.timetableName ? 'error' : ''}`}
                  placeholder="e.g., Fall 2024 Engineering Timetable"
                  value={formData.timetableName}
                  onChange={(e) => handleInputChange('timetableName', e.target.value)}
                />
                {errors.timetableName && <span className="error-text">{errors.timetableName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="academicYear">Academic Year *</label>
                <input
                  type="text"
                  id="academicYear"
                  className={`form-input ${errors.academicYear ? 'error' : ''}`}
                  placeholder="e.g., 2024-2025"
                  value={formData.academicYear}
                  onChange={(e) => handleInputChange('academicYear', e.target.value)}
                />
                {errors.academicYear && <span className="error-text">{errors.academicYear}</span>}
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  className={`form-input ${errors.description ? 'error' : ''}`}
                  placeholder="Brief description of this timetable (e.g., Semester 1 Engineering Timetable)"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
                {errors.description && <span className="error-text">{errors.description}</span>}
              </div>
            </div>
          </div>

          {/* Schedule Duration */}
          <div className="form-section">
            <div className="section-header">
              <Calendar className="section-icon" />
              <h3>Schedule Duration</h3>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="startDate">Start Date *</label>
                <input
                  type="date"
                  id="startDate"
                  className={`form-input ${errors.startDate ? 'error' : ''}`}
                  min={getCurrentDate()}
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                />
                {errors.startDate && <span className="error-text">{errors.startDate}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="endDate">End Date *</label>
                <input
                  type="date"
                  id="endDate"
                  className={`form-input ${errors.endDate ? 'error' : ''}`}
                  min={getMinEndDate()}
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                />
                {errors.endDate && <span className="error-text">{errors.endDate}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="timezone">Timezone</label>
                <select
                  id="timezone"
                  className="form-input"
                  value={formData.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                >
                  <option value="UTC+05:30">India Standard Time (UTC+05:30)</option>
                  <option value="UTC+00:00">Greenwich Mean Time (UTC+00:00)</option>
                  <option value="UTC-05:00">Eastern Standard Time (UTC-05:00)</option>
                  <option value="UTC-08:00">Pacific Standard Time (UTC-08:00)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div className="preview-section">
            <div className="preview-header">
              <FileText className="preview-icon" />
              <h3>Preview</h3>
            </div>
            <div className="preview-card">
              <h4>{formData.timetableName || 'Timetable Name'}</h4>
              <p className="preview-description">{formData.description || 'Description will appear here'}</p>
              <div className="preview-details">
                <div className="preview-item">
                  <strong>Academic Year:</strong> {formData.academicYear || 'Not specified'}
                </div>
                <div className="preview-item">
                  <strong>Duration:</strong>
                  {formData.startDate && formData.endDate
                    ? ` ${new Date(formData.startDate).toLocaleDateString()} - ${new Date(formData.endDate).toLocaleDateString()}`
                    : ' Not specified'
                  }
                </div>
                {timetableCode && (
                  <div className="preview-item timetable-code-preview">
                    <strong>Timetable Code:</strong>{' '}
                    <span className="code-value">{timetableCode}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={copyCodeToClipboard}
                      style={{ marginLeft: '0.5rem' }}
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                    <p className="code-hint">Share this code with students and faculty to view the timetable</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {errors.submit && (
        <div className="error-banner" style={{ marginBottom: '1rem' }}>
          {errors.submit}
        </div>
      )}

      <div className="step-actions">
        {!isFirstStep && (
          <button className="btn btn-secondary" onClick={onPrevious} disabled={saving}>
            <ArrowLeft className="btn-icon-left" />
            Previous
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="btn-icon spinner" />
              Creating Timetable...
            </>
          ) : (
            <>
              Save & Continue
              <ArrowRight className="btn-icon-right" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}