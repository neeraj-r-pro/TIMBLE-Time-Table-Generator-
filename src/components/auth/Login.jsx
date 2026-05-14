import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';
import { FaFacebookF, FaGoogle, FaApple, FaEye, FaEyeSlash } from 'react-icons/fa';
import { BsShieldLockFill } from 'react-icons/bs';
import { FaChalkboardUser, FaPen, FaUserGraduate } from 'react-icons/fa6';
import loginIllustration from '../../assets/images/login-illustration.svg';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    timetableCode: '',
    rememberMe: false,
    role: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: 'student', label: 'Student', icon: FaUserGraduate },
    { id: 'faculty', label: 'Faculty', icon: FaChalkboardUser },
    { id: 'creator', label: 'Creator', icon: FaPen }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleRoleSelect = (roleId) => {
    setFormData({
      ...formData,
      role: roleId
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (formData.role === 'student') {
      if (!formData.timetableCode) {
        setError('Please enter timetable code');
        return;
      }
    } else {
      if (!formData.email || !formData.password) {
        setError('Please fill in all fields');
        return;
      }
    }

    if (!formData.role) {
      setError('Please select a role');
      return;
    }

    setLoading(true);
    try {
      // Import authAPI
      const { authAPI } = await import('../../services/api');
      
      // Map 'creator' role to 'admin' for API
      const apiRole = formData.role === 'creator' ? 'admin' : formData.role;
      
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password,
        role: apiRole,
        timetableCode: formData.timetableCode
      });

      // Redirect to dashboard based on role
      if (formData.role === 'creator') {
        navigate('/admin/dashboard');
      } else if (formData.role === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate(`/${formData.role}/dashboard`);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <BsShieldLockFill className="logo-icon" /> TIMBLE
        </div>
        
        <div className="auth-content">
          <div className="auth-form-side">
            <h1 className="auth-title">Login</h1>
            <p className="auth-subtitle">Login to access your personal account</p>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit} className="auth-form">
              {/* Role Selection */}
              <div className="user-type-selection">
                <label className="user-type-label">Select Your Role</label>
                <div className="user-type-cards">
                  {roles.map((role) => {
                    const IconComponent = role.icon;
                    return (
                      <div
                        key={role.id}
                        className={`user-type-card ${formData.role === role.id ? 'selected' : ''}`}
                        onClick={() => handleRoleSelect(role.id)}
                      >
                        <IconComponent className="user-type-icon" />
                        <span className="user-type-name">{role.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {formData.role === 'student' ? (
                <div className="form-group">
                  <label htmlFor="timetableCode">Timetable Code</label>
                  <input
                    type="text"
                    id="timetableCode"
                    name="timetableCode"
                    value={formData.timetableCode}
                    onChange={handleChange}
                    placeholder="Enter timetable code"
                    required
                    style={{ textTransform: 'uppercase' }}
                  />
                  <small style={{ color: '#6b7280', marginTop: '0.25rem', display: 'block' }}>
                    Enter the code provided by your administrator
                  </small>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john.doe@gmail.com"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <div className="password-input-container">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Password"
                        required
                      />
                      <button 
                        type="button" 
                        className="password-toggle" 
                        onClick={togglePasswordVisibility}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>
                </>
              )}
              
              {formData.role !== 'student' && (
                <div className="form-row">
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                    />
                    <label htmlFor="rememberMe">Remember me</label>
                  </div>
                  <div className="forgot-password-container">
                    <a href="#" className="forgot-password">Forgot Password</a>
                  </div>
                </div>
              )}

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
            
            <div className="auth-links">
              <p className="no-account">
                Don't have an account? <Link to="/signup" className="signup-link">Sign up</Link>
              </p>
            </div>

          </div>
          
          <div className="auth-image-side">
            <div className="auth-image">
              <img src={loginIllustration} alt="Login illustration" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;