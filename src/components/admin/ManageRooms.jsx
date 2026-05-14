import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Loader2, DoorOpen } from 'lucide-react';
import './ManageRooms.css';
import { roomsAPI, institutionsAPI } from '../../services/api';

export function ManageRooms() {
  const [rooms, setRooms] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
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
      fetchRooms();
    } else {
      setRooms([]);
      setLoading(false);
    }
  }, [selectedInstitutionId]);

  const fetchRooms = async () => {
    if (!selectedInstitutionId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await roomsAPI.getAll(selectedInstitutionId);
      setRooms(data || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room =>
    (room.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (room.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddRoom = () => {
    setEditingRoom(null);
    setIsDialogOpen(true);
  };

  const handleEditRoom = (room) => {
    setEditingRoom(room);
    setIsDialogOpen(true);
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room?')) {
      return;
    }

    try {
      await roomsAPI.delete(id);
      await fetchRooms(); // Refresh the list
    } catch (err) {
      console.error('Error deleting room:', err);
      alert('Failed to delete room: ' + (err.message || 'Unknown error'));
    }
  };

  const handleSaveRoom = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);

      const roomData = {
        name: formData.get('name'),
        code: formData.get('code') || undefined,
        capacity: formData.get('capacity') ? parseInt(formData.get('capacity')) : undefined,
        building: formData.get('building') || undefined,
        type: 'Classroom',
        floor: 0,
        equipment: [],
      };
      if (!editingRoom) roomData.institutionId = selectedInstitutionId;

      if (editingRoom) {
        await roomsAPI.update(editingRoom.id, roomData);
      } else {
        if (!selectedInstitutionId) throw new Error('Select an institution first');
        await roomsAPI.create(roomData);
      }

      setIsDialogOpen(false);
      await fetchRooms(); // Refresh the list
    } catch (err) {
      console.error('Error saving room:', err);
      setError(err.message || 'Failed to save room');
    } finally {
      setSaving(false);
    }
  };

  const selectedInstitution = institutions.find((i) => i.id === selectedInstitutionId);

  if (!institutions.length) {
    return (
      <div className="manage-rooms">
        <div className="empty-state">
          <DoorOpen className="empty-icon" />
          <h4>No institutions yet</h4>
          <p>Create an institution first under Institution → Manage Institutions.</p>
        </div>
      </div>
    );
  }

  if (loading && !rooms.length) {
    return (
      <div className="manage-rooms">
        <div className="loading-container">
          <Loader2 className="spinner" />
          <p>Loading rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-rooms">
      <div className="page-header">
        <div>
          <h1>Manage Rooms</h1>
          <p className="page-subtitle">Add and manage classroom and laboratory spaces</p>
        </div>
        <button onClick={handleAddRoom} className="btn btn-primary" disabled={!selectedInstitutionId}>
          <Plus className="btn-icon" />
          Add Room
        </button>
      </div>

      {error && !loading && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={fetchRooms}>Retry</button>
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
              placeholder="Search rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-field"
            />
          </div>
        </div>

        {!selectedInstitutionId ? (
          <p className="hint-text">Select an institution to manage its rooms.</p>
        ) : rooms.length === 0 ? (
          <div className="empty-state">
            <DoorOpen className="empty-icon" />
            <h4>No rooms</h4>
            <p>Add rooms for {selectedInstitution?.name}.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Room Name</th>
                  <th>Building</th>
                  <th>Capacity</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => (
                  <tr key={room.id}>
                    <td className="td-name">{room.code}</td>
                    <td className="td-name">{room.name}</td>
                    <td>{room.building || '—'}</td>
                    <td>{room.capacity || '—'}</td>
                    <td className="text-right">
                      <div className="action-buttons">
                        <button
                          className="btn-icon-only"
                          onClick={() => handleEditRoom(room)}
                        >
                          <Pencil className="icon-sm" />
                        </button>
                        <button
                          className="btn-icon-only btn-danger"
                          onClick={() => handleDeleteRoom(room.id)}
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

      {isDialogOpen && (
        <div className="modal-overlay" onClick={() => setIsDialogOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRoom ? 'Edit Room' : 'Add New Room'}</h2>
            </div>
            <form onSubmit={handleSaveRoom} className="modal-form">
              <div className="form-group">
                <label htmlFor="name">Room Name</label>
                <input
                  id="name"
                  name="name"
                  defaultValue={editingRoom?.name}
                  placeholder="e.g., Room 101"
                  required
                  className="form-input"
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label htmlFor="code">Room Code</label>
                <input
                  id="code"
                  name="code"
                  defaultValue={editingRoom?.code}
                  placeholder="e.g., R-101"
                  className="form-input"
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label htmlFor="building">Building (optional)</label>
                <input
                  id="building"
                  name="building"
                  defaultValue={editingRoom?.building}
                  placeholder="e.g., Block A"
                  className="form-input"
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label htmlFor="capacity">Capacity (optional)</label>
                <input
                  id="capacity"
                  name="capacity"
                  type="number"
                  defaultValue={editingRoom?.capacity}
                  placeholder="e.g., 60"
                  className="form-input"
                  disabled={saving}
                />
              </div>
              {error && (
                <div className="error-message" style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fee', color: '#c33', borderRadius: '4px' }}>
                  {error}
                </div>
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
                    <>
                      {editingRoom ? 'Update' : 'Add'} Room
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
