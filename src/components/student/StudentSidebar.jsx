import { Calendar, LogOut } from 'lucide-react';
import './StudentSidebar.css';

export const StudentSidebar = ({ activeTab, onTabChange, onLogout }) => {
  const menuItems = [
    { id: 'timetable', label: 'View Timetable', icon: Calendar },
  ];

  return (
    <div className="student-sidebar">
      <div className="student-sidebar-header">
        <div className="student-sidebar-logo">
          <div className="student-logo-icon">
            <Calendar className="student-logo-calendar" />
          </div>
          <span className="student-logo-text">Student Portal</span>
        </div>
      </div>

      <div className="student-sidebar-content">
        <div className="student-sidebar-section">
          <div className="student-section-label">MENU</div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`student-menu-item ${activeTab === item.id ? 'active' : ''}`}
              >
                <Icon className="student-menu-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="student-sidebar-footer">
        <button onClick={onLogout} className="student-logout-menu-item">
          <LogOut className="student-menu-icon" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
