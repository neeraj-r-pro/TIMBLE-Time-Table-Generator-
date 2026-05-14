import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardOverview } from './DashboardOverview';
import { ManageInstitutions } from './ManageInstitutions';
import { ManageBatches } from './ManageBatches';
import { ManageRooms } from './ManageRooms';
import { ManageFaculties } from './ManageFaculties';
import { ManageSubjects } from './ManageSubjects';
import { GenerateTimetable } from './GenerateTimetable';
import { ViewTimetables } from './ViewTimetables';
import { ManageSemesters } from './ManageSemesters';
import { FacultyPreferenceAdmin } from './FacultyPreferenceAdmin';
import { Search, Bell, User, Menu } from 'lucide-react';
import './AdminDashboard.css'; // adjust path if needed

const AdminDashboard = ({ projectContext }) => {
  // Load activeTab from localStorage to persist across re-renders
  const loadActiveTab = () => {
    try {
      const saved = localStorage.getItem('admin_active_tab');
      return saved || 'dashboard';
    } catch {
      return 'dashboard';
    }
  };

  const [activeTab, setActiveTab] = useState(loadActiveTab);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('admin_active_tab', activeTab);
    } catch (err) {
      console.error('Error saving active tab:', err);
    }
  }, [activeTab]);

  const handleLogout = () => {
    // Clear any stored authentication data
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.clear();

    // Redirect to login page
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'institutions':
        return <ManageInstitutions />;
      case 'batches':
        return <ManageBatches />;
      case 'rooms':
        return <ManageRooms />;
      case 'faculties':
        return <ManageFaculties />;
      case 'subjects':
        return <ManageSubjects />;
      case 'timetable':
        return <GenerateTimetable />;
      case 'schedules':
        return <ViewTimetables />;
      case 'semesters':
        return <ManageSemesters />;
      case 'faculty-prefs-admin':
        return <FacultyPreferenceAdmin />;
      default:
        return (
          <div className="coming-soon">
            <div className="coming-soon-content">
              <h2>Coming Soon</h2>
              <p>This section is under development</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      {sidebarOpen && <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />}

      <div className={`main-content ${!sidebarOpen ? 'sidebar-hidden' : ''}`}>
        <header className="app-header">
          <div className="header-content">
            <div className="header-left">
              <button
                className="menu-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="icon" />
              </button>

              {projectContext && (
                <div className="project-info-mini">
                  <span className="project-name-mini">{projectContext.projectName}</span>
                  <span className="project-year-mini">{projectContext.academicYear}</span>
                </div>
              )}
            </div>

            <div className="search-container">
              <div className="search-wrapper">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="search-input"
                />
              </div>
            </div>

            <div className="header-actions">
              <button className="icon-button">
                <Bell className="icon" />
              </button>
              <div className="user-info">
                <div className="user-avatar">
                  <User className="user-icon" />
                </div>
                <div className="user-details">
                  <div className="user-name">Admin User</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="page-content">{renderContent()}</main>
      </div>
    </div>
  );
};

export default AdminDashboard;
