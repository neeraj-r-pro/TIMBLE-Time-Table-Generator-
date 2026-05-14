import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Auth Components
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';

// Admin Wrapper (includes project selection)
import { AdminWrapper } from './components/admin/AdminWrapper';

// Faculty Dashboard
import FacultyDashboard from './components/faculty/FacultyDashboard';

// Student Dashboard
import StudentDashboard from './components/student/StudentDashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Dashboard Routes */}
        <Route path="/admin/dashboard" element={<AdminWrapper />} />
        <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />

        {/* Default Routes */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
