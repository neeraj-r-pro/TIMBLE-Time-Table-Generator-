import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, BookOpen, Loader2, Copy } from 'lucide-react';
import './ManageSubjects.css';
import {
  subjectsAPI,
  batchesAPI,
  facultiesAPI,
  institutionsAPI,
} from '../../services/api';

export function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // New states for form handling
  const [totalHours, setTotalHours] = useState('');
  const [configStr, setConfigStr] = useState('');

  const [batches, setBatches] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');

  // Copy-subjects dialog state
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [sourceBatchId, setSourceBatchId] = useState('');
  // Selection state for bulk delete
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    institutionsAPI.getAll().then((data) => setInstitutions(data || [])).catch(console.error);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('admin_selected_institution_id');
    if (stored && institutions.some((i) => i.id === stored)) {
      setSelectedInstitutionId(stored);
    } else if (institutions.length > 0 && !selectedInstitutionId) {
      setSelectedInstitutionId(institutions[0].id);
    }
  }, [institutions]);

  useEffect(() => {
    if (selectedInstitutionId) {
      localStorage.setItem('admin_selected_institution_id', selectedInstitutionId);
    }
  }, [selectedInstitutionId]);

  // Load batches, faculties, and all subjects for the selected institution
  useEffect(() => {
    const loadInitialData = async () => {
      if (!selectedInstitutionId) {
        setSubjects([]);
        setBatches([]);
        setFaculties([]);
        setSelectedBatchId('');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        const [subjectsData, batchesData, facultiesData] = await Promise.all([
          subjectsAPI.getAll(null, selectedInstitutionId),
          batchesAPI.getAll(null, selectedInstitutionId),
          facultiesAPI.getAll(selectedInstitutionId),
        ]);

        setSubjects(subjectsData || []);
        setBatches(batchesData || []);
        setFaculties(facultiesData || []);
        setSelectedBatchId('');
      } catch (err) {
        console.error('Error loading subjects:', err);
        setError(err.message || 'Failed to load subjects');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [selectedInstitutionId]);

  const refreshSubjects = async () => {
    if (!selectedInstitutionId) return;
    try {
      const data = await subjectsAPI.getAll(null, selectedInstitutionId);
      setSubjects(data || []);
    } catch (err) {
      console.error('Error refreshing subjects:', err);
      setError(err.message || 'Failed to refresh subjects');
    }
  };

  const getBatchLabel = (batchId) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return '—';
    return `${batch.name} (${batch.code})`;
  };

  const getFacultyLabel = (facultyId) => {
    const faculty = faculties.find((f) => f.id === facultyId);
    if (!faculty) return 'Unassigned';
    return `${faculty.name} · ${faculty.department}`;
  };

  const handleAddSubject = () => {
    setEditingSubject(null);
    setTotalHours('');
    setConfigStr('');
    setIsDialogOpen(true);
  };

  const handleEditSubject = (subject) => {
    setEditingSubject(subject);
    
    const pPw = subject.periods_per_week || subject.periodsPerWeek || '';
    setTotalHours(pPw);

    if (subject.frequency_config && subject.frequency_config.length > 0) {
      const cfg = subject.frequency_config[0];
      setConfigStr(`${cfg.count}*${cfg.length}`);
    } else if (pPw) {
      const consec = subject.consecutive_periods || subject.consecutivePeriods || 1;
      const c = Math.ceil(pPw / consec);
      setConfigStr(`${c}*${consec}`);
    } else {
      setConfigStr('');
    }

    setIsDialogOpen(true);
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) {
      return;
    }

    try {
      await subjectsAPI.delete(id);
      setSelectedSubjectIds(prev => prev.filter(sid => sid !== id));
      await refreshSubjects();
    } catch (err) {
      console.error('Error deleting subject:', err);
      alert('Failed to delete subject: ' + (err.message || 'Unknown error'));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSubjectIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedSubjectIds.length} subjects?`)) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      await subjectsAPI.deleteBulk(selectedSubjectIds);
      setSelectedSubjectIds([]);
      await refreshSubjects();
    } catch (err) {
      console.error('Error bulk deleting subjects:', err);
      alert('Failed to delete subjects: ' + (err.message || 'Unknown error'));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedSubjectIds.length === filteredSubjects.length) {
      setSelectedSubjectIds([]);
    } else {
      setSelectedSubjectIds(filteredSubjects.map(s => s.id));
    }
  };

  const toggleSelectSubject = (id) => {
    setSelectedSubjectIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleSaveSubject = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);

      let finalPeriods = totalHours ? parseInt(totalHours, 10) : undefined;
      let finalConsecutive = undefined;
      let finalFrequencyConfig = undefined;

      if (configStr) {
         const parts = configStr.split('*');
         if (parts.length === 2) {
             const count = parseInt(parts[0], 10);
             const length = parseInt(parts[1], 10);
             if (!isNaN(count) && !isNaN(length)) {
                 finalConsecutive = length;
                 finalFrequencyConfig = [{ count, length }];
                 finalPeriods = count * length;
             }
         }
      }

      const subjectData = {
        batchId: editingSubject
          ? (editingSubject.batch_id || editingSubject.batchId)
          : selectedBatchId,
        name: formData.get('name'),
        code: formData.get('code'),
        facultyId: formData.get('facultyId') || undefined,
        periodsPerWeek: finalPeriods,
        consecutivePeriods: finalConsecutive,
        frequencyConfig: finalFrequencyConfig,
        type: formData.get('type') || undefined,
        requiresLab: formData.get('requiresLab') === 'on',
        maxStudentsPerGroup: formData.get('maxStudentsPerGroup')
          ? parseInt(formData.get('maxStudentsPerGroup'), 10)
          : undefined,
      };

      if (editingSubject) {
        await subjectsAPI.update(editingSubject.id, subjectData);
      } else {
        await subjectsAPI.create(subjectData);
      }

      setIsDialogOpen(false);
      await refreshSubjects();
    } catch (err) {
      console.error('Error saving subject:', err);
      setError(err.message || 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  };

  // ---- Copy subjects from another batch ----
  const handleOpenCopyDialog = () => {
    setSourceBatchId('');
    setIsCopyDialogOpen(true);
  };

  const handleCopySubjects = async () => {
    if (!sourceBatchId || !selectedBatchId) return;
    setCopying(true);
    setError(null);

    try {
      // Fetch subjects of the source batch
      const sourceSubjects = await subjectsAPI.getAll(sourceBatchId);

      if (!sourceSubjects || sourceSubjects.length === 0) {
        setError('No subjects found in the source batch.');
        setCopying(false);
        return;
      }

      // Create each subject in the target (currently selected) batch
      for (const sub of sourceSubjects) {
        await subjectsAPI.create({
          batchId: selectedBatchId,
          name: sub.name,
          code: sub.code,
          facultyId: sub.faculty_id || sub.facultyId || undefined,
          periodsPerWeek: sub.periods_per_week || sub.periodsPerWeek || undefined,
          consecutivePeriods: sub.consecutive_periods || sub.consecutivePeriods || undefined,
          type: sub.type || undefined,
          requiresLab: sub.requires_lab || sub.requiresLab || false,
          maxStudentsPerGroup: sub.max_students_per_group || sub.maxStudentsPerGroup || undefined,
        });
      }

      setIsCopyDialogOpen(false);
      await refreshSubjects();
    } catch (err) {
      console.error('Error copying subjects:', err);
      setError(err.message || 'Failed to copy subjects');
    } finally {
      setCopying(false);
    }
  };

  // Filter subjects by selected batch and search
  const filteredSubjects = subjects
    .filter((subject) => {
      if (selectedBatchId) {
        const subBatch = subject.batch_id || subject.batchId;
        return subBatch === selectedBatchId;
      }
      return true;
    })
    .filter((subject) => {
      const term = searchTerm.toLowerCase();
      if (!term) return true;

      const batchLabel = getBatchLabel(subject.batch_id || subject.batchId).toLowerCase();
      const facultyLabel = getFacultyLabel(subject.faculty_id || subject.facultyId).toLowerCase();

      return (
        subject.name.toLowerCase().includes(term) ||
        subject.code.toLowerCase().includes(term) ||
        batchLabel.includes(term) ||
        facultyLabel.includes(term)
      );
    });

  if (!institutions.length) {
    return (
      <div className="manage-subjects">
        <div className="empty-state">
          <BookOpen className="empty-icon" />
          <h4>No institutions yet</h4>
          <p>Create an institution first under Institution → Manage Institutions.</p>
        </div>
      </div>
    );
  }

  if (loading && !subjects.length && !batches.length) {
    return (
      <div className="manage-subjects">
        <div className="loading-container">
          <Loader2 className="spinner" />
          <p>Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-subjects">
      <div className="page-header">
        <div>
          <h1>Manage Subjects</h1>
          <p className="page-subtitle">
            Select a batch then add and manage its subjects
          </p>
        </div>
        <div className="header-actions">
          {selectedBatchId && (
            <button onClick={handleOpenCopyDialog} className="btn btn-outline">
              <Copy className="btn-icon" />
              Copy from Batch
            </button>
          )}
          <button
            onClick={handleBulkDelete}
            className="btn btn-danger"
            disabled={selectedSubjectIds.length === 0 || isBulkDeleting}
          >
            <Trash2 className="btn-icon" />
            Delete ({selectedSubjectIds.length})
          </button>
          <button
            onClick={handleAddSubject}
            className="btn btn-primary"
            disabled={!selectedBatchId}
          >
            <Plus className="btn-icon" />
            Add Subject
          </button>
        </div>
      </div>

      {error && !loading && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={refreshSubjects}>Retry</button>
        </div>
      )}

      <div className="content-card">
        <div className="subjects-filters">
          <select
            className="filter-select"
            value={selectedInstitutionId}
            onChange={(e) => setSelectedInstitutionId(e.target.value)}
          >
            <option value="">Select Institution</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} ({inst.code})
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            disabled={!selectedInstitutionId}
          >
            <option value="">All Batches</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name} ({batch.code})
              </option>
            ))}
          </select>

          <div className="search-input-wrapper flex-1">
            <Search className="search-icon-input" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-field"
            />
          </div>
        </div>

        {selectedBatchId && (
          <div className="batch-hint">
            <BookOpen className="hint-icon" />
            <span>
              Showing subjects for batch{' '}
              <strong>{batches.find((b) => b.id === selectedBatchId)?.name || ''}</strong>
            </span>
          </div>
        )}

        {!selectedInstitutionId ? (
          <div className="empty-state">
            <BookOpen className="empty-icon" />
            <h4>Select an institution</h4>
            <p>Choose an institution above to view its batches and subjects.</p>
          </div>
        ) : !selectedBatchId ? (
          <div className="empty-state">
            <BookOpen className="empty-icon" />
            <h4>Select a batch</h4>
            <p>Choose a batch above to view and manage its subjects.</p>
          </div>
        ) : filteredSubjects.length === 0 && !loading ? (
          <div className="empty-state">
            <BookOpen className="empty-icon" />
            <h4>No subjects found</h4>
            <p>Add your first subject to this batch, or copy subjects from another batch.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={filteredSubjects.length > 0 && selectedSubjectIds.length === filteredSubjects.length}
                    />
                  </th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Total Hours</th>
                  <th>Type</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((subject) => (
                  <tr key={subject.id} className={selectedSubjectIds.includes(subject.id) ? 'row-selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedSubjectIds.includes(subject.id)}
                        onChange={() => toggleSelectSubject(subject.id)}
                      />
                    </td>
                    <td className="td-name">{subject.code}</td>
                    <td className="td-name">{subject.name}</td>
                    <td>{subject.periods_per_week || subject.periodsPerWeek || '-'}</td>
                    <td>
                      {subject.type && (
                        <span className={`type-badge ${subject.type === 'lab' || subject.type === 'practical' ? 'type-lab' : 'type-theory'}`}>
                          {subject.type === 'lab' || subject.type === 'practical' ? 'Lab' : 'Theory'}
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="action-buttons">
                        <button
                          className="btn-icon-only"
                          onClick={() => handleEditSubject(subject)}
                        >
                          <Pencil className="icon-sm" />
                        </button>
                        <button
                          className="btn-icon-only btn-danger"
                          onClick={() => handleDeleteSubject(subject.id)}
                        >
                          <Trash2 className="icon-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Subject Dialog */}
      {isDialogOpen && (
        <div className="modal-overlay" onClick={() => setIsDialogOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h2>
              {!editingSubject && selectedBatchId && (
                <p className="modal-hint">
                  Batch: {batches.find((b) => b.id === selectedBatchId)?.name}
                </p>
              )}
            </div>
            <form onSubmit={handleSaveSubject} className="modal-form">
              {error && (
                <div
                  className="error-message"
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: '#fee',
                    color: '#c33',
                    borderRadius: '4px',
                  }}
                >
                  {error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="name">Subject Name</label>
                <input
                  id="name"
                  name="name"
                  defaultValue={editingSubject?.name}
                  placeholder="e.g., Data Structures"
                  required
                  className="form-input"
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="code">Subject Code</label>
                <input
                  id="code"
                  name="code"
                  defaultValue={editingSubject?.code}
                  placeholder="e.g., CS201"
                  required
                  className="form-input"
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="totalHours">Total Hours</label>
                <input
                  id="totalHours"
                  type="number"
                  min="1"
                  value={totalHours}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTotalHours(val);
                    if (val) setConfigStr(`${val}*1`);
                    else setConfigStr('');
                  }}
                  placeholder="e.g., 3"
                  className="form-input"
                  disabled={saving}
                />
              </div>

              {/* Keep the hidden configuration input so the state continues to map internally if logic requires it */}
              <input type="hidden" id="configStr" value={configStr} readOnly />

              <div className="form-group">
                <label htmlFor="type">Subject Type *</label>
                <select
                  id="type"
                  name="type"
                  defaultValue={editingSubject?.type || 'theory'}
                  className="form-input"
                  disabled={saving}
                >
                  <option value="theory">Theory</option>
                  <option value="lab">Lab</option>
                  <option value="practical">Practical</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="btn-icon spinner" />
                      Saving...
                    </>
                  ) : (
                    <>{editingSubject ? 'Update' : 'Add'} Subject</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copy Subjects from Batch Dialog */}
      {isCopyDialogOpen && (
        <div className="modal-overlay" onClick={() => setIsCopyDialogOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Copy Subjects from Another Batch</h2>
              <p className="modal-hint">
                Copies all subjects into:{' '}
                <strong>{batches.find((b) => b.id === selectedBatchId)?.name}</strong>
              </p>
            </div>
            <div className="modal-form">
              {error && (
                <div
                  className="error-message"
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: '#fee',
                    color: '#c33',
                    borderRadius: '4px',
                  }}
                >
                  {error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="sourceBatch">Source Batch</label>
                <select
                  id="sourceBatch"
                  className="form-input"
                  value={sourceBatchId}
                  onChange={(e) => setSourceBatchId(e.target.value)}
                  disabled={copying}
                >
                  <option value="">Select a batch to copy from</option>
                  {batches
                    .filter((b) => b.id !== selectedBatchId)
                    .map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} ({batch.code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCopyDialogOpen(false)}
                  disabled={copying}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!sourceBatchId || copying}
                  onClick={handleCopySubjects}
                >
                  {copying ? (
                    <>
                      <Loader2 className="btn-icon spinner" />
                      Copying...
                    </>
                  ) : (
                    <>
                      <Copy className="btn-icon" />
                      Copy Subjects
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
