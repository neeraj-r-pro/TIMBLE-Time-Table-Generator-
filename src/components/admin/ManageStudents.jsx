import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Download, Upload, Loader2 } from 'lucide-react';
import './ManageStudents.css';
import { studentsAPI } from '../../services/api';

export function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch students from API
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await studentsAPI.getAll();
      setStudents(data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = filterClass === 'all' || student.class === filterClass;
    
    return matchesSearch && matchesClass;
  });

  const handleAddStudent = () => {
    setEditingStudent(null);
    setIsDialogOpen(true);
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setIsDialogOpen(true);
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) {
      return;
    }

    try {
      await studentsAPI.delete(id);
      await fetchStudents(); // Refresh the list
    } catch (err) {
      console.error('Error deleting student:', err);
      alert('Failed to delete student: ' + (err.message || 'Unknown error'));
    }
  };

  const handleSaveStudent = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      
      const studentData = {
        name: formData.get('name'),
        rollNo: formData.get('rollNo'),
        email: formData.get('email'),
        class: formData.get('class'),
        semester: parseInt(formData.get('semester')),
        section: formData.get('section'),
      };

      if (editingStudent) {
        await studentsAPI.update(editingStudent.id, studentData);
      } else {
        await studentsAPI.create(studentData);
      }

      setIsDialogOpen(false);
      await fetchStudents(); // Refresh the list
    } catch (err) {
      console.error('Error saving student:', err);
      setError(err.message || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="manage-students">
        <div className="loading-container">
          <Loader2 className="spinner" />
          <p>Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-students">
      <div className="page-header">
        <div>
          <h1>Manage Students</h1>
          <p className="page-subtitle">Add and manage enrolled students</p>
        </div>
        <div className="header-buttons">
          <button className="btn btn-secondary">
            <Upload className="btn-icon" />
            Import CSV
          </button>
          <button className="btn btn-secondary">
            <Download className="btn-icon" />
            Export
          </button>
          <button onClick={handleAddStudent} className="btn btn-primary">
            <Plus className="btn-icon" />
            Add Student
          </button>
        </div>
      </div>

      {error && !loading && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={fetchStudents}>Retry</button>
        </div>
      )}

      <div className="content-card">
        <div className="filter-section">
          <div className="search-input-wrapper flex-1">
            <Search className="search-icon-input" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-field"
            />
          </div>
          <select 
            value={filterClass} 
            onChange={(e) => setFilterClass(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Classes</option>
            {Array.from(new Set(students.map(s => s.class))).map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>

        {students.length === 0 && !loading ? (
          <div className="empty-state">
            <p>No students found. Add your first student.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Class</th>
                  <th>Semester</th>
                  <th>Section</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className="td-name">{student.rollNo}</td>
                  <td className="td-name">{student.name}</td>
                  <td>{student.email}</td>
                  <td>
                    <span className="badge">{student.class}</span>
                  </td>
                  <td>{student.semester}</td>
                  <td>{student.section}</td>
                  <td className="text-right">
                    <div className="action-buttons">
                      <button
                        className="btn-icon-only"
                        onClick={() => handleEditStudent(student)}
                      >
                        <Pencil className="icon-sm" />
                      </button>
                      <button
                        className="btn-icon-only btn-danger"
                        onClick={() => handleDeleteStudent(student.id)}
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

        {students.length > 0 && (
          <div className="table-footer">
            Showing {filteredStudents.length} of {students.length} students
          </div>
        )}
      </div>

      {isDialogOpen && (
        <div className="modal-overlay" onClick={() => setIsDialogOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingStudent ? 'Edit Student' : 'Add New Student'}</h2>
            </div>
            <form onSubmit={handleSaveStudent} className="modal-form">
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
                  defaultValue={editingStudent?.name}
                  placeholder="John Doe"
                  required
                  className="form-input"
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label htmlFor="rollNo">Roll Number</label>
                <input
                  id="rollNo"
                  name="rollNo"
                  defaultValue={editingStudent?.roll_no || editingStudent?.rollNo}
                  placeholder="CS2021001"
                  required
                  className="form-input"
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={editingStudent?.email}
                  placeholder="john.doe@student.edu"
                  required
                  className="form-input"
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label htmlFor="class">Class/Department</label>
                <input
                  id="class"
                  name="class"
                  type="text"
                  defaultValue={editingStudent?.class}
                  placeholder="Computer Science"
                  required
                  className="form-input"
                  disabled={saving}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="semester">Semester</label>
                  <input
                    id="semester"
                    name="semester"
                    type="number"
                    min="1"
                    max="8"
                    defaultValue={editingStudent?.semester || 1}
                    required
                    className="form-input"
                    disabled={saving}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="section">Section</label>
                  <select name="section" defaultValue={editingStudent?.section || 'A'} required className="form-input" disabled={saving}>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
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
                      {editingStudent ? 'Update' : 'Add'} Student
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
