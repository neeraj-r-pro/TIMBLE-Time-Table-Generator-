import React from 'react';
import AdminDashboard from './AdminDashboard';

export function AdminWrapper() {
  // Default project context - can be customized later
  const defaultProjectContext = {
    projectId: '1',
    projectName: '',
    projectDescription: 'Primary timetable system',
    academicYear: '',
    institutionType: 'college',
    createdBy: 'Admin User',
    stats: {
      faculties: 0,
      rooms: 0,
      schedules: 0
    }
  };

  return (
    <div className="admin-wrapper">
      {/* Direct to Admin Dashboard */}
      <AdminDashboard projectContext={defaultProjectContext} />

      <style jsx>{`
        .admin-wrapper {
          min-height: 100vh;
          background: #f8fafc;
        }
      `}</style>
    </div>
  );
}
