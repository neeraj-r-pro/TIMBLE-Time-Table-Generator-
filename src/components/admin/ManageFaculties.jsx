import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Loader2, Users } from 'lucide-react';
import './ManageFaculties.css';
import { facultiesAPI, institutionsAPI } from '../../services/api';

export function ManageFaculties() {
  const [faculties, setFaculties] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
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
      fetchFaculties();
    } else {
      setFaculties([]);
      setLoading(false);
    }
  }, [selectedInstitutionId]);

  const fetchFaculties = async () => {
    if (!selectedInstitutionId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await facultiesAPI.getAll(selectedInstitutionId);
      setFaculties(data || []);
    } catch (err) {
      console.error('Error fetching faculties:', err);
      setError(err.message || 'Failed to load faculties');
    } finally {
      setLoading(false);
    }
  };

  const filteredFaculties = faculties.filter(faculty =>
    (faculty.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (faculty.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddFaculty = () => {
    setEditingFaculty(null);
    setIsDialogOpen(true);
  };

  const handleEditFaculty = (faculty) => {
    setEditingFaculty(faculty);
    setIsDialogOpen(true);
  };

  const handleDeleteFaculty = async (id) => {
    if (!window.confirm('Are you sure you want to delete this faculty?')) {
      return;
    }

    try {
      await facultiesAPI.delete(id);
      await fetchFaculties(); // Refresh the list
    } catch (err) {
      console.error('Error deleting faculty:', err);
      alert('Failed to delete faculty: ' + (err.message || 'Unknown error'));
    }
  };

  const handleSaveFaculty = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);

      const facultyData = {
        name: formData.get('name'),
        code: formData.get('code') || undefined,
        email: formData.get('email') || undefined,
        phone: formData.get('phone') || undefined,
        department: formData.get('department') || undefined,
        designation: formData.get('designation') || undefined,
        maxHoursPerWeek: formData.get('maxHoursPerWeek')
          ? parseInt(formData.get('maxHoursPerWeek'))
          : undefined,
      };
      if (!editingFaculty) facultyData.institutionId = selectedInstitutionId;

      if (editingFaculty) {
        await facultiesAPI.update(editingFaculty.id, facultyData);
      } else {
        if (!selectedInstitutionId) throw new Error('Select an institution first');
        await facultiesAPI.create(facultyData);
      }

      setIsDialogOpen(false);
      await fetchFaculties(); // Refresh the list
    } catch (err) {
      console.error('Error saving faculty:', err);
      setError(err.message || 'Failed to save faculty');
    } finally {
      setSaving(false);
    }
  };

  const selectedInstitution = institutions.find((i) => i.id === selectedInstitutionId);

  if (!institutions.length) {
    return (
      <div className="manage-faculties">
        <div className="empty-state">
          <Users className="empty-icon" />
          <h4>No institutions yet</h4>
          <p>Create an institution first under Institution → Manage Institutions.</p>
        </div>
      </div>
    );
  }

  if (loading && !faculties.length) {
    return (
      <div className="manage-faculties">
        <div className="loading-container">
          <Loader2 className="spinner" />
          <p>Loading faculties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-faculties">
      <div className="page-header">
        <div>
          <h1>Manage Faculties</h1>
          <p className="page-subtitle">Add and manage teaching staff members</p>
        </div>
        <div className="header-actions">
          <button
            onClick={() => {
              const adminFaculty = {
                name: 'Admin User',
                email: 'admin@university.edu',
                phone: '+1 234-567-8900',
                department: 'Administration',
                designation: 'Administrator',
                subjects: ['Management', 'Administration'],
                maxHoursPerWeek: 15
              };
              setEditingFaculty(adminFaculty);
              setIsDialogOpen(true);
            }}
            className="btn btn-secondary"
          >
            Add Myself as Faculty
          </button>
          <button onClick={handleAddFaculty} className="btn btn-primary" disabled={!selectedInstitutionId}>
            <Plus className="btn-icon" />
            Add Faculty
          </button>
        </div>
      </div>

      {error && !loading && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={fetchFaculties}>Retry</button>
        </div>
      )}

      <div className="content-card">
        <div className="search-section">
          <select
            className="institution-select"
            value={selectedInstitutionId}
            onChange={(e) => setSelectedInstitutionId(e.target.value)}
            style={{ marginBottom: '1rem', minWidth: '220px' }}
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
              placeholder="Search faculties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-field"
            />
          </div>
        </div>

        {!selectedInstitutionId ? (
          <p className="hint-text">Select an institution to manage its faculties.</p>
        ) : faculties.length === 0 ? (
          <div className="empty-state">
            <Users className="empty-icon" />
            <h4>No faculties</h4>
            <p>Add faculties for {selectedInstitution?.name}.</p>
          </div>
        ) : (
          <div className="faculty-grid">
            {filteredFaculties.map((faculty) => (
              <div key={faculty.id} className="faculty-card">
                <div className="faculty-header">
                  <div>
                    <h3 className="faculty-name">{faculty.name}</h3>
                    {faculty.code && <p className="faculty-designation">Code: {faculty.code}</p>}
                  </div>
                  <div className="faculty-actions">
                    <button
                      className="btn-icon-only"
                      onClick={() => handleEditFaculty(faculty)}
                    >
                      <Pencil className="icon-sm" />
                    </button>
                    <button
                      className="btn-icon-only btn-danger"
                      onClick={() => handleDeleteFaculty(faculty.id)}
                    >
                      <Trash2 className="icon-sm" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isDialogOpen && (
        <div className="modal-overlay" onClick={() => setIsDialogOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingFaculty ? 'Edit Faculty' : 'Add New Faculty'}</h2>
            </div>
            <form onSubmit={handleSaveFaculty} className="modal-form">
              {error && (
                <div className="error-message" style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fee', color: '#c33', borderRadius: '4px' }}>
                  {error}
                </div>
              )}
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  name="name"
                  defaultValue={editingFaculty?.name}
                  placeholder="Dr. John Doe"
                  required
                  className="form-input"
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label htmlFor="code">Faculty Code</label>
                <input
                  id="code"
                  name="code"
                  defaultValue={editingFaculty?.code}
                  placeholder="e.g., FAC-01"
                  className="form-input"
                  disabled={saving}
                />
              </div>
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
                    <>
                      {editingFaculty ? 'Update' : 'Add'} Faculty
                    </>
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
