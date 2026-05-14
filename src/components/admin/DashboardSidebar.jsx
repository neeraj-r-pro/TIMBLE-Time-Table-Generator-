import { useState } from 'react';
import { Calendar, Users, DoorOpen, GraduationCap, Settings, LayoutDashboard, Clock, FileText, LogOut, BookOpen, Building2, ChevronDown, ChevronRight, UserCog } from 'lucide-react';
import './DashboardSidebar.css';

const INSTITUTION_SUBS = [
  { id: 'institutions', label: 'Manage Institutions', icon: Building2 },
  { id: 'batches', label: 'Batches', icon: GraduationCap },
  { id: 'rooms', label: 'Rooms', icon: DoorOpen },
  { id: 'faculties', label: 'Faculties', icon: Users },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'semesters', label: 'Semesters', icon: Calendar },
  { id: 'faculty-prefs-admin', label: 'Faculty Preferences', icon: UserCog },
];

export function DashboardSidebar({ activeTab, onTabChange, onLogout }) {
  const [institutionExpanded, setInstitutionExpanded] = useState(
    () => INSTITUTION_SUBS.some((s) => s.id === activeTab)
  );

  const isInstitutionTab = (id) => INSTITUTION_SUBS.some((s) => s.id === id);

  const mainItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'timetable', label: 'Generate Timetable', icon: Calendar },
  ];

  const otherItems = [
    { id: 'schedules', label: 'View Schedules', icon: Clock },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <Calendar className="logo-calendar" />
          </div>
          <span className="logo-text">TIMBLE</span>
        </div>
      </div>

      <div className="sidebar-content">
        <div className="sidebar-section">
          <div className="section-label">MENU</div>
          {mainItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
              >
                <Icon className="menu-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="sidebar-subsection">
            <button
              className={`menu-item menu-item-expandable ${institutionExpanded ? 'expanded' : ''}`}
              onClick={() => setInstitutionExpanded(!institutionExpanded)}
            >
              <Building2 className="menu-icon" />
              <span>Institution</span>
              {institutionExpanded ? (
                <ChevronDown className="expand-icon" />
              ) : (
                <ChevronRight className="expand-icon" />
              )}
            </button>
            {institutionExpanded && (
              <div className="submenu">
                {INSTITUTION_SUBS.map((sub) => {
                  const Icon = sub.icon;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => onTabChange(sub.id)}
                      className={`menu-item submenu-item ${activeTab === sub.id ? 'active' : ''}`}
                    >
                      <Icon className="menu-icon" />
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-section sidebar-section-other">
          <div className="section-label">OTHERS</div>
          {otherItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
              >
                <Icon className="menu-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sidebar-footer">
        <button onClick={onLogout} className="logout-menu-item">
          <LogOut className="menu-icon" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
