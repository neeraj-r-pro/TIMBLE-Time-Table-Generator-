import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Loader2, Building2, Copy, Check } from 'lucide-react';
import './ManageInstitutions.css';
import { institutionsAPI } from '../../services/api';

export function ManageInstitutions() {
  const [institutions, setInstitutions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await institutionsAPI.getAll();
      setInstitutions(data || []);
    } catch (err) {
      console.error('Error fetching institutions:', err);
      setError(err.message || 'Failed to load institutions');
    } finally {
      setLoading(false);
    }
  };

  const filteredInstitutions = institutions.filter(
    (inst) =>
      inst.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleAdd = () => {
    setEditingInstitution(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (inst) => {
    setEditingInstitution(inst);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure? Deleting an institution will remove all its rooms, batches, and related data.')) return;
    try {
      await institutionsAPI.delete(id);
      await fetchInstitutions();
    } catch (err) {
      console.error('Error deleting institution:', err);
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
        description: formData.get('description') || null,
      };
      if (editingInstitution) {
        await institutionsAPI.update(editingInstitution.id, payload);
      } else {
        await institutionsAPI.create(payload);
      }
      setIsDialogOpen(false);
      await fetchInstitutions();
    } catch (err) {
      console.error('Error saving institution:', err);
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="manage-institutions">
        <div className="loading-container">
          <Loader2 className="spinner" />
          <p>Loading institutions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-institutions">
      <div className="page-header">
        <div>
          <h1>Manage Institutions</h1>
          <p className="page-subtitle">Create and manage institutions. Each institution has a unique code for identification.</p>
        </div>
        <button onClick={handleAdd} className="btn btn-primary">
          <Plus className="btn-icon" />
          Add Institution
        </button>
      </div>

      {error && !loading && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={fetchInstitutions}>Retry</button>
        </div>
      )}

      <div className="content-card">
        <div className="search-section">
          <div className="search-input-wrapper">
            <Search className="search-icon-input" />
            <input
              type="text"
              placeholder="Search institutions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-field"
            />
          </div>
        </div>

        {institutions.length === 0 && !loading ? (
          <div className="empty-state">
            <Building2 className="empty-icon" />
            <h4>No institutions yet</h4>
            <p>Create your first institution to manage rooms, batches, faculties, and subjects.</p>
          </div>
        ) : (
          <div className="institutions-grid">
            {filteredInstitutions.map((inst) => (
              <div key={inst.id} className="institution-card">
                <div className="institution-card-header">
                  <div>
                    <h3 className="institution-name">{inst.name}</h3>
                    <div className="institution-code-row">
                      <span className="institution-code-badge">{inst.code}</span>
                      <button
                        type="button"
                        className="btn-copy-code"
                        onClick={() => handleCopyCode(inst.code)}
                        title="Copy code"
                      >
                        {copiedCode === inst.code ? (
                          <Check className="icon-sm" />
                        ) : (
                          <Copy className="icon-sm" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="action-buttons">
                    <button className="btn-icon-only" onClick={() => handleEdit(inst)}>
                      <Pencil className="icon-sm" />
                    </button>
                    <button className="btn-icon-only btn-danger" onClick={() => handleDelete(inst.id)}>
                      <Trash2 className="icon-sm" />
                    </button>
                  </div>
                </div>
                {inst.description && (
                  <p className="institution-description">{inst.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isDialogOpen && (
        <div className="modal-overlay" onClick={() => setIsDialogOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingInstitution ? 'Edit Institution' : 'Add New Institution'}</h2>
              {editingInstitution && (
                <p className="modal-code-hint">Code: {editingInstitution.code}</p>
              )}
            </div>
            <form onSubmit={handleSave} className="modal-form">
              <div className="form-group">
                <label htmlFor="name">Institution Name</label>
                <input
                  id="name"
                  name="name"
                  defaultValue={editingInstitution?.name}
                  placeholder="e.g., ABC College"
                  required
                  className="form-input"
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description (optional)</label>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={editingInstitution?.description}
                  placeholder="Brief description..."
                  rows={3}
                  className="form-input"
                  disabled={saving}
                />
              </div>
              {error && (
                <div className="error-message">{error}</div>
              )}
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
                    editingInstitution ? 'Update' : 'Create'
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
