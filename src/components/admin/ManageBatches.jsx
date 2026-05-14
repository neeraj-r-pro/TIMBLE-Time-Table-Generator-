import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Loader2, GraduationCap } from 'lucide-react';
import './ManageBatches.css';
import { batchesAPI, institutionsAPI } from '../../services/api';

export function ManageBatches() {
  const [batches, setBatches] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

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
      fetchBatches();
    } else {
      setBatches([]);
      setLoading(false);
    }
  }, [selectedInstitutionId]);

  const fetchBatches = async () => {
    if (!selectedInstitutionId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await batchesAPI.getAll(null, selectedInstitutionId);
      setBatches(data || []);
    } catch (err) {
      console.error('Error fetching batches:', err);
      setError(err.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const filteredBatches = batches.filter(
    (b) =>
      b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    setEditingBatch(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (batch) => {
    setEditingBatch(batch);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;
    try {
      await batchesAPI.delete(id);
      await fetchBatches();
    } catch (err) {
      console.error('Error deleting batch:', err);
      alert('Failed to delete: ' + (err.message || 'Unknown error'));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData(e.currentTarget);
      const payload = {
        name: formData.get('name'),
        code: formData.get('code'),
        institutionId: selectedInstitutionId,
      };
      if (editingBatch) {
        await batchesAPI.update(editingBatch.id, payload);
      } else {
        await batchesAPI.create(payload);
      }
      setIsDialogOpen(false);
      await fetchBatches();
    } catch (err) {
      console.error('Error saving batch:', err);
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const selectedInstitution = institutions.find((i) => i.id === selectedInstitutionId);

  if (!institutions.length) {
    return (
      <div className="manage-batches">
        <div className="empty-state">
          <GraduationCap className="empty-icon" />
          <h4>No institutions yet</h4>
          <p>Create an institution first under Institution → Manage Institutions.</p>
        </div>
      </div>
    );
  }

  if (loading && !batches.length) {
    return (
      <div className="manage-batches">
        <div className="loading-container">
          <Loader2 className="spinner" />
          <p>Loading batches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-batches">
      <div className="page-header">
        <div>
          <h1>Manage Batches</h1>
          <p className="page-subtitle">Add and manage class batches for an institution</p>
        </div>
        <button
          onClick={handleAdd}
          className="btn btn-primary"
          disabled={!selectedInstitutionId}
        >
          <Plus className="btn-icon" />
          Add Batch
        </button>
      </div>

      <div className="content-card">
        <div className="filters-row">
          <select
            className="institution-select"
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
          <div className="search-input-wrapper">
            <Search className="search-icon-input" />
            <input
              type="text"
              placeholder="Search batches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-field"
            />
          </div>
        </div>

        {!selectedInstitutionId ? (
          <p className="hint-text">Select an institution to manage its batches.</p>
        ) : error && !loading ? (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={fetchBatches}>Retry</button>
          </div>
        ) : batches.length === 0 ? (
          <div className="empty-state">
            <GraduationCap className="empty-icon" />
            <h4>No batches</h4>
            <p>Add batches for {selectedInstitution?.name}.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((b) => (
                  <tr key={b.id}>
                    <td className="td-name">{b.code}</td>
                    <td>{b.name}</td>
                    <td className="text-right">
                      <div className="action-buttons">
                        <button className="btn-icon-only" onClick={() => handleEdit(b)}>
                          <Pencil className="icon-sm" />
                        </button>
                        <button className="btn-icon-only btn-danger" onClick={() => handleDelete(b.id)}>
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

      {isDialogOpen && (
        <div className="modal-overlay" onClick={() => setIsDialogOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingBatch ? 'Edit Batch' : 'Add New Batch'}</h2>
              {selectedInstitution && (
                <p className="modal-hint">Institution: {selectedInstitution.name}</p>
              )}
            </div>
            <form onSubmit={handleSave} className="modal-form">
              <div className="form-group">
                <label htmlFor="name">Batch Name</label>
                <input
                  id="name"
                  name="name"
                  defaultValue={editingBatch?.name}
                  placeholder="e.g., Computer Science A"
                  required
                  className="form-input"
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label htmlFor="code">Batch Code</label>
                <input
                  id="code"
                  name="code"
                  defaultValue={editingBatch?.code}
                  placeholder="e.g., CS-A"
                  required
                  className="form-input"
                  disabled={saving}
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="btn-icon spinner" />
                      Saving...
                    </>
                  ) : (
                    editingBatch ? 'Update' : 'Add'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
