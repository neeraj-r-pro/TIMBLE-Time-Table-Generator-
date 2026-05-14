import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentSidebar } from './StudentSidebar';
import StudentTimetableViewer from './StudentTimetableViewer';
import { Bell, User, Menu } from 'lucide-react';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const [activeTab, setActiveTab] = useState('timetable');
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
      case 'timetable':
        return <StudentTimetableViewer />;
      default:
        return <StudentTimetableViewer />;
    }
  };

  return (
    <div className="student-app-container">
      {sidebarOpen && <StudentSidebar activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />}

      <div className={`student-main-content ${!sidebarOpen ? 'sidebar-hidden' : ''}`}>
        <header className="student-app-header">
          <div className="student-header-content">
            <button 
              className="student-menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="student-icon" />
            </button>
            
            <div className="student-header-actions">
              <button className="student-icon-button">
                <Bell className="student-icon" />
              </button>
              <div className="student-user-info">
                <div className="student-user-avatar">
                  <User className="student-user-icon" />
                </div>
                <div className="student-user-details">
                  <div className="student-user-name">Student</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="student-page-content">{renderContent()}</main>
      </div>
    </div>
  );
};

export default StudentDashboard;
