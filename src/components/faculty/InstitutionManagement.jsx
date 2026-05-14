// Institution Management Component
import React, { useState, useEffect } from 'react';
import { Building2, Plus, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import './FacultyDashboard.css';
import './InstitutionManagement.css';
import { facultiesAPI } from '../../services/api';

const InstitutionManagement = () => {
  const [institutions, setInstitutions] = useState([]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadInstitutions = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await facultiesAPI.getMyInstitutions();
      setInstitutions(data || []);
    } catch (err) {
      console.error('Error loading faculty institutions:', err);
      setError(err.message || 'Failed to load your institutions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstitutions();
  }, []);

  const handleLinkInstitution = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter an institution code');
      return;
    }

    try {
      setLinking(true);
      setError('');
      setSuccess('');
      await facultiesAPI.linkInstitutionByCode(code.trim().toUpperCase());
      setSuccess('Institution linked successfully. Your creator can now manage you under this institution.');
      setCode('');
      await loadInstitutions();
    } catch (err) {
      console.error('Error linking institution:', err);
      setError(err.message || 'Failed to link institution. Check the code and try again.');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkInstitution = async (inst) => {
    if (!window.confirm(`Are you sure you want to remove "${inst.name}"? You will need the institution code to re-link.`)) {
      return;
    }
    try {
      setError('');
      setSuccess('');
      await facultiesAPI.unlinkInstitution(inst.id);
      setSuccess(`"${inst.name}" has been removed.`);
      await loadInstitutions();
    } catch (err) {
      console.error('Error unlinking institution:', err);
      setError(err.message || 'Failed to remove institution.');
    }
  };

  return (
    <div className="institution-management-container">
      <div className="preference-header">
        <div>
          <h1>Institution Connections</h1>
          <p className="preference-subtitle">
            Manage your affiliations by linking to institution codes provided by administrators.
          </p>
        </div>
      </div>

      <div className="institution-grid-layout">
        <div className="institution-add-section">
          <div className="code-entry-card refined-card">
            <div className="code-entry-icon">
              <Building2 />
            </div>
            <h3>Add New Institution</h3>
            <p>
              Enter the unique 8-20 character code shared with you.
            </p>
            <form onSubmit={handleLinkInstitution} className="code-entry-form">
              <div className="input-group">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError('');
                    setSuccess('');
                  }}
                  placeholder="ENTER CODE HERE"
                  className="code-input-large"
                  maxLength={20}
                  disabled={linking}
                />
              </div>

              {error && (
                <div className="code-error animate-in">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              {success && (
                <div className="code-success animate-in">
                  {success}
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-full" disabled={linking}>
                {linking ? (
                  <>
                    <Loader2 className="btn-icon spinner" />
                    Linking Profile...
                  </>
                ) : (
                  <>
                    <Plus className="btn-icon" />
                    Connect Institution
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="institution-list-section">
          <div className="preference-card">
            <div className="preference-card-header">
              <div className="preference-card-title">
                <Building2 className="preference-icon" />
                <h3>Active Connections</h3>
              </div>
              <span className="badge">{institutions.length} Linked</span>
            </div>

            <div className="institution-scroll-area">
              {loading ? (
                <div className="loading-state">
                  <Loader2 className="spinner" />
                  <p>Fetching connections...</p>
                </div>
              ) : institutions.length === 0 ? (
                <div className="empty-state">
                  <Building2 className="empty-icon" />
                  <p>No active connections found.</p>
                  <p className="empty-subtitle">
                    Connect to an institution to start managing your preferences.
                  </p>
                </div>
              ) : (
                <div className="institution-cards-list">
                  {institutions.map((inst) => (
                    <div key={inst.id} className="institution-item-card">
                      <div className="inst-icon-circle">
                        <Building2 size={18} />
                      </div>
                      <div className="inst-details">
                        <div className="inst-name">{inst.name}</div>
                        <div className="inst-info-row">
                          <span className="inst-code-badge">ID: {inst.code}</span>
                          {inst.type && <span className="inst-type">{inst.type}</span>}
                        </div>
                      </div>
                      <button
                        className="btn-unlink"
                        onClick={() => handleUnlinkInstitution(inst)}
                        title="Unlink Institution"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstitutionManagement;
