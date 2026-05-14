import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowRight,
  ArrowLeft,
  Save,
  GraduationCap,
  Loader2
} from 'lucide-react';
import './TimetableSteps.css';
import { batchesAPI } from '../../../services/api';

export function BatchManagement({ data, onComplete, onNext, onPrevious, isFirstStep }) {
  const timetableId = data.basicInfo?.timetableId;
  const [batches, setBatches] = useState(data.batches || []);
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (timetableId && batches.length === 0) {
      setLoading(true);
      batchesAPI.getAll(timetableId).then(b => {
        if (b && b.length > 0) setBatches(b);
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [timetableId]);
  const [editingBatch, setEditingBatch] = useState(null);
  const [batchForm, setBatchForm] = useState({
    name: '',
    code: '',
    year: '1',
    semester: '1',
    stream: '',
    studentCount: '',
    section: ''
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setBatchForm({
      name: '',
      code: '',
      year: '1',
      semester: '1',
      stream: '',
      studentCount: '',
      section: ''
    });
    setErrors({});
  };

  const handleInputChange = (field, value) => {
    setBatchForm(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-generate code when name changes
    if (field === 'name' && value.trim()) {
      const code = value
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .split(' ')
        .map(word => word.substring(0, 2))
        .join('') + 
        batchForm.year + 
        (batchForm.section ? batchForm.section.toUpperCase() : 'A');
      
      setBatchForm(prev => ({
        ...prev,
        code: code
      }));
    }

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

    if (!batchForm.name.trim()) {
      newErrors.name = 'Batch name is required';
    }

    if (!batchForm.code.trim()) {
      newErrors.code = 'Batch code is required';
    }

    if (!batchForm.stream.trim()) {
      newErrors.stream = 'Stream/Department is required';
    }

    if (!batchForm.studentCount || batchForm.studentCount < 1) {
      newErrors.studentCount = 'Valid student count is required';
    }

    // Check for duplicate codes
    const existingCodes = batches
      .filter(batch => editingBatch === null || batch.id !== editingBatch.id)
      .map(batch => batch.code.toLowerCase());
    
    if (existingCodes.includes(batchForm.code.toLowerCase())) {
      newErrors.code = 'Batch code already exists';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddBatch = async () => {
    if (validateForm()) {
      setSaving(true);
      try {
        const batchData = {
          name: batchForm.name,
          code: batchForm.code,
          year: parseInt(batchForm.year),
          semester: parseInt(batchForm.semester),
          stream: batchForm.stream,
          studentCount: parseInt(batchForm.studentCount),
          section: batchForm.section || null,
          ...(timetableId && { timetableId })
        };

        const savedBatch = await batchesAPI.create(batchData);
        setBatches([...batches, savedBatch]);
        resetForm();
        setIsAddingBatch(false);
      } catch (err) {
        console.error('Error creating batch:', err);
        setErrors({ submit: err.message || 'Failed to create batch' });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleEditBatch = (batch) => {
    setEditingBatch(batch);
    setBatchForm({
      ...batch,
      studentCount: batch.studentCount.toString(),
      year: batch.year.toString(),
      semester: batch.semester.toString()
    });
    setIsAddingBatch(true);
  };

  const handleUpdateBatch = async () => {
    if (validateForm()) {
      setSaving(true);
      try {
        const batchData = {
          name: batchForm.name,
          code: batchForm.code,
          year: parseInt(batchForm.year),
          semester: parseInt(batchForm.semester),
          stream: batchForm.stream,
          studentCount: parseInt(batchForm.studentCount),
          section: batchForm.section || null
        };

        const updatedBatch = await batchesAPI.update(editingBatch.id, batchData);
        setBatches(batches.map(batch => 
          batch.id === editingBatch.id ? updatedBatch : batch
        ));
        
        resetForm();
        setIsAddingBatch(false);
        setEditingBatch(null);
      } catch (err) {
        console.error('Error updating batch:', err);
        setErrors({ submit: err.message || 'Failed to update batch' });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) {
      return;
    }

    try {
      await batchesAPI.delete(batchId);
      setBatches(batches.filter(batch => batch.id !== batchId));
    } catch (err) {
      console.error('Error deleting batch:', err);
      alert('Failed to delete batch: ' + (err.message || 'Unknown error'));
    }
  };

  const handleSave = () => {
    if (batches.length === 0) {
      alert('Please add at least one batch before continuing');
      return;
    }
    onComplete(batches);
  };

  const handleCancel = () => {
    resetForm();
    setIsAddingBatch(false);
    setEditingBatch(null);
  };

  return (
    <div className="timetable-step">
      <div className="step-header">
        <div className="step-icon-wrapper">
          <Users className="step-main-icon" />
        </div>
        <div className="step-title-section">
          <h2>Batch Management</h2>
          <p>Create and manage classes/batches for your institution</p>
        </div>
      </div>

      <div className="batch-management-content">
        {/* Batch List */}
        <div className="batches-section">
          <div className="section-header">
            <h3>Existing Batches ({batches.length})</h3>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setIsAddingBatch(true)}
              disabled={isAddingBatch}
            >
              <Plus className="btn-icon" />
              Add Batch
            </button>
          </div>

          {batches.length === 0 ? (
            <div className="empty-state">
              <GraduationCap className="empty-icon" />
              <h4>No Batches Added</h4>
              <p>Start by adding your first batch/class</p>
            </div>
          ) : (
            <div className="batches-grid">
              {batches.map((batch) => (
                <div key={batch.id} className="batch-card">
                  <div className="batch-header">
                    <div className="batch-info">
                      <h4>{batch.name}</h4>
                      <span className="batch-code">{batch.code}</span>
                    </div>
                    <div className="batch-actions">
                      <button 
                        className="btn-icon-only btn-edit"
                        onClick={() => handleEditBatch(batch)}
                        title="Edit batch"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="btn-icon-only btn-delete"
                        onClick={() => handleDeleteBatch(batch.id)}
                        title="Delete batch"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="batch-details">
                    <div className="detail-item">
                      <span className="detail-label">Stream:</span>
                      <span className="detail-value">{batch.stream}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Year/Semester:</span>
                      <span className="detail-value">{batch.year}/{batch.semester}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Students:</span>
                      <span className="detail-value">{batch.studentCount}</span>
                    </div>
                    {batch.section && (
                      <div className="detail-item">
                        <span className="detail-label">Section:</span>
                        <span className="detail-value">{batch.section}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Batch Form */}
        {isAddingBatch && (
          <div className="batch-form-section">
            <div className="section-header">
              <h3>{editingBatch ? 'Edit Batch' : 'Add New Batch'}</h3>
            </div>

            <div className="batch-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="batchName">Batch Name *</label>
                  <input
                    type="text"
                    id="batchName"
                    className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="e.g., Computer Science Engineering"
                    value={batchForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="batchCode">Batch Code *</label>
                  <input
                    type="text"
                    id="batchCode"
                    className={`form-input ${errors.code ? 'error' : ''}`}
                    placeholder="e.g., CSE1A"
                    value={batchForm.code}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                  />
                  {errors.code && <span className="error-text">{errors.code}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="stream">Stream/Department *</label>
                  <input
                    type="text"
                    id="stream"
                    className={`form-input ${errors.stream ? 'error' : ''}`}
                    placeholder="e.g., Computer Science"
                    value={batchForm.stream}
                    onChange={(e) => handleInputChange('stream', e.target.value)}
                  />
                  {errors.stream && <span className="error-text">{errors.stream}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="year">Year</label>
                  <select
                    id="year"
                    className="form-input"
                    value={batchForm.year}
                    onChange={(e) => handleInputChange('year', e.target.value)}
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="semester">Semester</label>
                  <select
                    id="semester"
                    className="form-input"
                    value={batchForm.semester}
                    onChange={(e) => handleInputChange('semester', e.target.value)}
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="studentCount">Student Count *</label>
                  <input
                    type="number"
                    id="studentCount"
                    className={`form-input ${errors.studentCount ? 'error' : ''}`}
                    placeholder="e.g., 60"
                    min="1"
                    value={batchForm.studentCount}
                    onChange={(e) => handleInputChange('studentCount', e.target.value)}
                  />
                  {errors.studentCount && <span className="error-text">{errors.studentCount}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="section">Section (Optional)</label>
                  <input
                    type="text"
                    id="section"
                    className="form-input"
                    placeholder="e.g., A, B, C"
                    maxLength="2"
                    value={batchForm.section}
                    onChange={(e) => handleInputChange('section', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={editingBatch ? handleUpdateBatch : handleAddBatch}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="btn-icon spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="btn-icon" />
                      {editingBatch ? 'Update Batch' : 'Add Batch'}
                    </>
                  )}
                </button>
                {errors.submit && (
                  <div className="error-text" style={{ marginTop: '0.5rem' }}>
                    {errors.submit}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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