import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { BsShieldLockFill } from 'react-icons/bs';
import { FaChalkboardUser, FaPen, FaUserGraduate } from 'react-icons/fa6';
import signupIllustration from '../../assets/images/signup-illustration.svg';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: 'faculty', label: 'Faculty', icon: FaChalkboardUser },
    { id: 'creator', label: 'Creator', icon: FaPen }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleRoleSelect = (roleId) => {
    setFormData({
      ...formData,
      role: roleId
    });
  };

  const togglePasswordVisibility = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.role) {
      setError('Please select a role');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      // Import authAPI
      const { authAPI } = await import('../../services/api');

      // Map 'creator' role to 'admin' for API
      const apiRole = formData.role === 'creator' ? 'admin' : formData.role;

      // Combine firstName and lastName into name
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      const response = await authAPI.register({
        email: formData.email,
        password: formData.password,
        name: fullName,
        role: apiRole
      });

      // Store token if provided
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      // Redirect to appropriate dashboard
      if (formData.role === 'creator') {
        navigate('/admin/dashboard');
      } else {
        navigate(`/${formData.role}/dashboard`);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
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
          <div className="auth-image-side">
            <div className="auth-image">
              <img src={signupIllustration} alt="Signup illustration" />
            </div>
          </div>
          <div className="auth-form-side">
            <h1 className="auth-title">Sign up</h1>
            <p className="auth-subtitle">Get started by creating your personal account</p>

            {error && <div className="error-message">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
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

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    required
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
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
                    onClick={() => togglePasswordVisibility('password')}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="password-input-container">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => togglePasswordVisibility('confirm')}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>


              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <div className="auth-links">
              <p className="no-account">
                Already have an account?
                <Link to="/login" className="signup-link">Login</Link>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;