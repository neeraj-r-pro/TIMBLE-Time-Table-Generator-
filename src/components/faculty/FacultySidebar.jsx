import { Calendar, Users, Settings, LayoutDashboard, Clock, FileText, LogOut, User, Building2 } from 'lucide-react';
import './FacultySidebar.css';

export function FacultySidebar({ activeTab, onTabChange, onLogout }) {
  const menuItems = [
    { id: 'preferences', label: 'Set Preferences', icon: Settings },
    { id: 'timetables', label: 'View Timetables', icon: Calendar },
    { id: 'institutions', label: 'Manage Institutions', icon: Building2 },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  return (
    <div className="faculty-sidebar">
      <div className="faculty-sidebar-header">
        <div className="faculty-sidebar-logo">
          <div className="faculty-logo-icon">
            <Calendar className="faculty-logo-calendar" />
          </div>
          <span className="faculty-logo-text">TIMBLE</span>
        </div>
      </div>

      <div className="faculty-sidebar-content">
        <div className="faculty-sidebar-section">
          <div className="faculty-section-label">FACULTY MENU</div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`faculty-menu-item ${activeTab === item.id ? 'active' : ''}`}
              >
                <Icon className="faculty-menu-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="faculty-sidebar-footer">
        <button onClick={onLogout} className="faculty-logout-menu-item">
          <LogOut className="faculty-menu-icon" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

