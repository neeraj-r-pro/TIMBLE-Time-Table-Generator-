import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, BookOpen, Save, Edit, Loader2 } from 'lucide-react';
import './FacultyProfile.css';
import { authAPI, facultiesAPI } from '../../services/api';

const FacultyProfile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [facultyId, setFacultyId] = useState(null);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    experience: '',
    specialization: '',
    office: '',
    joiningDate: '',
    subjects: []
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Get user data from localStorage (from signup/login)
      const user = authAPI.getCurrentUser();
      
      if (user) {
        // Initialize with user data from signup
        const initialProfile = {
          name: user.name || '',
          email: user.email || '',
          phone: '', // Phone might not be in user object, will check faculty data
          department: '',
          designation: '',
          experience: '',
          specialization: '',
          office: '',
          joiningDate: '',
          subjects: []
        };

        // Try to fetch faculty data if it exists
        try {
          const faculties = await facultiesAPI.getAll();
          const faculty = faculties.find(f => f.user_id === user.id || f.email === user.email);
          
          if (faculty) {
            setFacultyId(faculty.id);
            // Merge faculty data with user data
            setProfile({
              ...initialProfile,
              name: faculty.name || initialProfile.name,
              email: faculty.email || initialProfile.email,
              phone: faculty.phone || initialProfile.phone,
              department: faculty.department || '',
              designation: faculty.designation || ''
            });
          } else {
            // Faculty record doesn't exist yet, use user data only
            setProfile(initialProfile);
          }
        } catch (err) {
          console.error('Error fetching faculty data:', err);
          // Use user data only if faculty fetch fails
          setProfile(initialProfile);
        }
      }
    } catch (err) {
      console.error('Error loading profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const user = authAPI.getCurrentUser();
      if (!user) {
        alert('User not found. Please login again.');
        return;
      }

      // Prepare data for backend (only fields that exist in database)
      const facultyData = {
        name: profile.name,
        email: profile.email,
        phone: profile.phone || null,
        department: profile.department || null,
        designation: profile.designation || null
      };

      if (facultyId) {
        // Update existing faculty record
        await facultiesAPI.update(facultyId, facultyData);
      } else {
        // Create new faculty record - requires department and designation
        if (!profile.department || !profile.designation) {
          alert('Please fill in Department and Designation before saving your profile for the first time.');
          setSaving(false);
          return;
        }
        const newFaculty = await facultiesAPI.create(facultyData);
        if (newFaculty && newFaculty.id) {
          setFacultyId(newFaculty.id);
        }
      }

      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      alert(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfile({
      ...profile,
      [field]: value
    });
  };

  if (loading) {
    return (
      <div className="faculty-profile">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loader2 className="loading-spinner" style={{ animation: 'spin 1s linear infinite', width: '48px', height: '48px', color: '#3b82f6' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="faculty-profile">
      <div className="profile-header">
        <div>
          <h1>My Profile</h1>
          <p className="profile-subtitle">Manage your faculty profile information</p>
        </div>
        <div className="profile-actions">
          {isEditing ? (
            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="btn-icon" style={{ animation: 'spin 1s linear infinite' }} />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="btn-icon" />
                  Save Changes
                </>
              )}
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="btn btn-secondary">
              <Edit className="btn-icon" />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-avatar">
              <User className="avatar-icon" />
            </div>
            <div className="profile-basic-info">
              <h2>{profile.name || 'Your Name'}</h2>
              <p className="profile-designation">{profile.designation || 'Designation not set'}</p>
              <p className="profile-department">{profile.department || 'Department not set'}</p>
            </div>
          </div>

          <div className="profile-details">
            <div className="detail-section">
              <h3>Contact Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <Mail className="detail-icon" />
                  <div className="detail-content">
                    <label>Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="form-input"
                      />
                    ) : (
                      <span>{profile.email || 'Not provided'}</span>
                    )}
                  </div>
                </div>

                <div className="detail-item">
                  <Phone className="detail-icon" />
                  <div className="detail-content">
                    <label>Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="form-input"
                      />
                    ) : (
                      <span>{profile.phone || 'Not provided'}</span>
                    )}
                  </div>
                </div>

                <div className="detail-item">
                  <MapPin className="detail-icon" />
                  <div className="detail-content">
                    <label>Office</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profile.office}
                        onChange={(e) => handleInputChange('office', e.target.value)}
                        className="form-input"
                      />
                    ) : (
                      <span>{profile.office || 'Not provided'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Professional Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <BookOpen className="detail-icon" />
                  <div className="detail-content">
                    <label>Department</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profile.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        className="form-input"
                        placeholder="Enter department"
                      />
                    ) : (
                      <span>{profile.department || 'Not provided'}</span>
                    )}
                  </div>
                </div>

                <div className="detail-item">
                  <User className="detail-icon" />
                  <div className="detail-content">
                    <label>Designation</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profile.designation}
                        onChange={(e) => handleInputChange('designation', e.target.value)}
                        className="form-input"
                        placeholder="Enter designation"
                      />
                    ) : (
                      <span>{profile.designation || 'Not provided'}</span>
                    )}
                  </div>
                </div>

                <div className="detail-item">
                  <Calendar className="detail-icon" />
                  <div className="detail-content">
                    <label>Joining Date</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={profile.joiningDate}
                        onChange={(e) => handleInputChange('joiningDate', e.target.value)}
                        className="form-input"
                      />
                    ) : (
                      <span>{profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'Not provided'}</span>
                    )}
                  </div>
                </div>

                <div className="detail-item">
                  <User className="detail-icon" />
                  <div className="detail-content">
                    <label>Experience</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profile.experience}
                        onChange={(e) => handleInputChange('experience', e.target.value)}
                        className="form-input"
                      />
                    ) : (
                      <span>{profile.experience || 'Not provided'}</span>
                    )}
                  </div>
                </div>

                <div className="detail-item full-width">
                  <BookOpen className="detail-icon" />
                  <div className="detail-content">
                    <label>Specialization</label>
                    {isEditing ? (
                      <textarea
                        value={profile.specialization}
                        onChange={(e) => handleInputChange('specialization', e.target.value)}
                        className="form-textarea"
                        rows="3"
                      />
                    ) : (
                      <span>{profile.specialization || 'Not provided'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Teaching Subjects</h3>
              <div className="subjects-list">
                {profile.subjects && profile.subjects.length > 0 ? (
                  profile.subjects.map((subject, index) => (
                    <span key={index} className="subject-tag">
                      {subject}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#6b7280', fontStyle: 'italic' }}>No subjects assigned yet</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyProfile;

