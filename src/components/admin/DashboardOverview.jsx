import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import './DashboardOverview.css';
import { roomsAPI, facultiesAPI, timetablesAPI, batchesAPI, studentsAPI, institutionsAPI, timetableManagementAPI } from '../../services/api';
import { Building2, Calendar as CalendarIcon, Users, Layout, Clock, Info } from 'lucide-react';

export function DashboardOverview() {
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalFaculties: 0,
    totalSchedules: 0,
    averageWorkload: 0,
    highWorkload: 0,
    optimalWorkload: 0,
    lowWorkload: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [institutions, setInstitutions] = useState([]);
  const [timetablesList, setTimetablesList] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [selectedTimetableId, setSelectedTimetableId] = useState('overall');
  const [rawStats, setRawStats] = useState({
    rooms: [],
    faculties: [],
    timetables: [],
    batches: [],
    students: []
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedInstitutionId) {
      fetchTimetables(selectedInstitutionId);
    } else {
      setTimetablesList([]);
      setSelectedTimetableId('overall');
    }
  }, [selectedInstitutionId]);

  useEffect(() => {
    calculateStats();
  }, [selectedInstitutionId, selectedTimetableId, rawStats]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const insts = await institutionsAPI.getAll();
      setInstitutions(insts || []);

      const storedInst = localStorage.getItem('admin_selected_institution_id');
      if (storedInst && insts.some(i => i.id === storedInst)) {
        setSelectedInstitutionId(storedInst);
      } else if (insts.length > 0) {
        setSelectedInstitutionId(insts[0].id);
      }

      await fetchRawData();
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetables = async (institutionId) => {
    try {
      const tts = await timetableManagementAPI.getAll({ institutionId });
      setTimetablesList(tts || []);
    } catch (err) {
      console.error('Error fetching timetables:', err);
    }
  };

  const fetchRawData = async () => {
    try {
      const [rooms, faculties, timetables, batches, students] = await Promise.all([
        roomsAPI.getAll(),
        facultiesAPI.getAll(),
        timetablesAPI.getAll(),
        batchesAPI.getAll(),
        studentsAPI.getAll()
      ]);

      setRawStats({
        rooms: rooms || [],
        faculties: faculties || [],
        timetables: timetables || [],
        batches: batches || [],
        students: students || []
      });
    } catch (err) {
      console.error('Error fetching raw data:', err);
      setError('Failed to load statistics data');
    }
  };

  const calculateStats = () => {
    const { rooms, faculties, timetables, batches, students } = rawStats;

    // Filter by institution first
    const instRooms = rooms.filter(r => !selectedInstitutionId || r.institution_id === selectedInstitutionId);
    const instFaculties = faculties.filter(f => !selectedInstitutionId || f.institution_id === selectedInstitutionId);
    let filteredEntries = timetables.filter(t => !selectedInstitutionId || (t.institution_id === selectedInstitutionId || (t.batch && t.batch.institution_id === selectedInstitutionId)));
    let filteredBatches = batches.filter(b => !selectedInstitutionId || b.institution_id === selectedInstitutionId);

    // Then filter by timetable if specific one is selected
    if (selectedTimetableId !== 'overall') {
      filteredEntries = filteredEntries.filter(e => e.timetable_id === selectedTimetableId);
      // For batches in a timetable, we find unique batch IDs from the entries
      const timetableBatchIds = new Set(filteredEntries.map(e => e.batch_id));
      filteredBatches = filteredBatches.filter(b => timetableBatchIds.has(b.id));
    }

    // Calculate workload from filtered entries
    const facultyHours = new Map();
    filteredEntries.forEach(entry => {
      if (entry.faculty_id) {
        const current = facultyHours.get(entry.faculty_id) || 0;
        facultyHours.set(entry.faculty_id, current + 1);
      }
    });

    const workloads = Array.from(facultyHours.values());
    const highWorkload = workloads.filter(h => h >= 20).length;
    const optimalWorkload = workloads.filter(h => h >= 15 && h < 20).length;
    const lowWorkload = workloads.filter(h => h < 15).length;
    const avgWorkload = workloads.length > 0
      ? (workloads.reduce((a, b) => a + b, 0) / workloads.length).toFixed(1)
      : 0;

    setStats({
      totalRooms: instRooms.length,
      totalFaculties: instFaculties.length,
      totalSchedules: filteredEntries.length,
      averageWorkload: avgWorkload,
      highWorkload,
      optimalWorkload,
      lowWorkload,
      totalBatches: filteredBatches.length
    });
  };

  const fetchStats = async () => {
    setError(null);
    setLoading(true);
    await fetchRawData();
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="dashboard-overview">
        <div className="loading-container">
          <Loader2 className="spinner" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-overview">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Dashboard</h1>

        <div className="dashboard-filters" style={{ display: 'flex', gap: '1rem' }}>
          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Institution</label>
            <select
              value={selectedInstitutionId}
              onChange={(e) => setSelectedInstitutionId(e.target.value)}
              className="dashboard-select"
              style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', minWidth: '160px' }}
            >
              <option value="">All Institutions</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Timetable Context</label>
            <select
              value={selectedTimetableId}
              onChange={(e) => setSelectedTimetableId(e.target.value)}
              className="dashboard-select"
              disabled={!selectedInstitutionId}
              style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', minWidth: '160px' }}
            >
              <option value="overall">Overall (All Batches)</option>
              {timetablesList.map(tt => (
                <option key={tt.id} value={tt.id}>{tt.name} ({tt.code})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={fetchStats}>Retry</button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#eff6ff', color: '#3b82f6', padding: '0.5rem', borderRadius: '0.5rem', width: 'fit-content', marginBottom: '0.5rem' }}>
            <Building2 size={20} />
          </div>
          <div className="stat-label">Rooms</div>
          <div className="stat-value">{stats.totalRooms}</div>
          <div className="stat-description">Available in institution</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#f5f3ff', color: '#8b5cf6', padding: '0.5rem', borderRadius: '0.5rem', width: 'fit-content', marginBottom: '0.5rem' }}>
            <Users size={20} />
          </div>
          <div className="stat-label">Faculties</div>
          <div className="stat-value">{stats.totalFaculties}</div>
          <div className="stat-description">Staff members</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#ecfdf5', color: '#10b981', padding: '0.5rem', borderRadius: '0.5rem', width: 'fit-content', marginBottom: '0.5rem' }}>
            <Layout size={20} />
          </div>
          <div className="stat-label">Allocations</div>
          <div className="stat-value">{stats.totalSchedules}</div>
          <div className="stat-description">Assigned sessions</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap" style={{ background: '#fffbeb', color: '#f59e0b', padding: '0.5rem', borderRadius: '0.5rem', width: 'fit-content', marginBottom: '0.5rem' }}>
            <Clock size={20} />
          </div>
          <div className="stat-label">Avg. Workload</div>
          <div className="stat-value">{stats.averageWorkload}h</div>
          <div className="stat-description">Hours per faculty/week</div>
        </div>
      </div>

      {/* Faculty Workload Overview */}
      {stats.totalFaculties > 0 && (
        <div className="workload-section">
          <div className="section-header">
            <h3>Faculty Workload Overview</h3>
            <p className="section-subtitle">Current teaching hours per faculty</p>
          </div>

          <div className="workload-grid">
            <div className="workload-card">
              <div className="workload-category high-workload">
                <div className="workload-count">{stats.highWorkload}</div>
                <div className="workload-label">High Workload</div>
                <div className="workload-range">20+ hours/week</div>
              </div>
            </div>

            <div className="workload-card">
              <div className="workload-category optimal-workload">
                <div className="workload-count">{stats.optimalWorkload}</div>
                <div className="workload-label">Optimal Workload</div>
                <div className="workload-range">15-20 hours/week</div>
              </div>
            </div>

            <div className="workload-card">
              <div className="workload-category low-workload">
                <div className="workload-count">{stats.lowWorkload}</div>
                <div className="workload-label">Low Workload</div>
                <div className="workload-range">Below 15 hours/week</div>
              </div>
            </div>
          </div>

          {stats.highWorkload > 0 && (
            <div className="workload-suggestions">
              <h4>Optimization Suggestions</h4>
              <div className="suggestions-list">
                {stats.highWorkload > 0 && (
                  <div className="suggestion-item">
                    <div className="suggestion-icon high">!</div>
                    <div className="suggestion-content">
                      <strong>{stats.highWorkload} {stats.highWorkload === 1 ? 'faculty is' : 'faculties are'} overloaded</strong> - Consider redistributing classes or hiring additional staff
                    </div>
                  </div>
                )}
                {stats.lowWorkload > 0 && (
                  <div className="suggestion-item">
                    <div className="suggestion-icon low">↗</div>
                    <div className="suggestion-content">
                      <strong>{stats.lowWorkload} {stats.lowWorkload === 1 ? 'faculty has' : 'faculties have'} capacity</strong> - Can accommodate additional classes or cover for sick leave
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
