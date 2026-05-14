import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FacultySidebar } from './FacultySidebar';
import PreferenceManagement from './PreferenceManagement';
import TimetableViewer from './TimetableViewer';
import FacultyProfile from './FacultyProfile';
import InstitutionManagement from './InstitutionManagement';
import { Search, Bell, User, Menu } from 'lucide-react';
import './FacultyDashboard.css';

const FacultyDashboard = () => {
  const [activeTab, setActiveTab] = useState('preferences');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

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
      case 'preferences':
        return <PreferenceManagement />;
      case 'timetables':
        return <TimetableViewer />;
      case 'institutions':
        return <InstitutionManagement />;
      case 'profile':
        return <FacultyProfile />;
      default:
        return <PreferenceManagement />;
    }
  };

  return (
    <div className="faculty-app-container">
      {sidebarOpen && <FacultySidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />}

      <div className={`faculty-main-content ${!sidebarOpen ? 'sidebar-hidden' : ''}`}>
        <header className="faculty-app-header">
          <div className="faculty-header-content">
            <button 
              className="faculty-menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="faculty-icon" />
            </button>
            
            <div className="faculty-search-container">
              <div className="faculty-search-wrapper">
                <Search className="faculty-search-icon" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="faculty-search-input"
                />
              </div>
            </div>

            <div className="faculty-header-actions">
              <button className="faculty-icon-button">
                <Bell className="faculty-icon" />
              </button>
              <div className="faculty-user-info">
                <div className="faculty-user-avatar">
                  <User className="faculty-user-icon" />
                </div>
                <div className="faculty-user-details">
                  <div className="faculty-user-name">Faculty User</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="faculty-page-content">{renderContent()}</main>
      </div>
    </div>
  );
};

export default FacultyDashboard;

