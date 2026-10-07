import React, { useState } from 'react';
import { X, Lock, User, KeyRound, Sparkles, AlertCircle, Eye, EyeOff, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function AuthModal() {
  const { authModalOpen, setAuthModalOpen, handleLogin, handleRegister } = useApp();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!authModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        await handleRegister({
          full_name: fullName,
          email,
          username,
          password,
          confirm_password: confirmPassword,
        });
      } else {
        await handleLogin(username, password);
      }
      setAuthModalOpen(false);
    } catch (err) {
      setError(err.message || 'Authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername('admin');
    setPassword('admin123');
    setIsRegisterMode(false);
    setError(null);
  };

  return (
    <div className="modal-backdrop" onClick={() => setAuthModalOpen(false)}>
      <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <KeyRound className="modal-icon" size={22} />
            <h2>{isRegisterMode ? 'Create your account' : 'Welcome back'}</h2>
          </div>
          <button
            className="modal-close-btn"
            onClick={() => setAuthModalOpen(false)}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tab-bar">
          <button
            type="button"
            className={`auth-tab ${!isRegisterMode ? 'active' : ''}`}
            onClick={() => {
              setIsRegisterMode(false);
              setError(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${isRegisterMode ? 'active' : ''}`}
            onClick={() => {
              setIsRegisterMode(true);
              setError(null);
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="auth-error-banner animate-fade-in">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegisterMode && (
            <>
              <div className="form-group">
                <label>Full name</label>
                <div className="input-with-icon">
                  <User size={16} className="input-icon" />
                  <input type="text" className="input-field" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label>Email address</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input type="email" className="input-field" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
            </>
          )}
          <div className="form-group">
            <label>Email or username</label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                type="text"
                className="input-field"
                placeholder={isRegisterMode ? 'Choose a username' : 'Enter email or username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          {isRegisterMode && (
            <div className="form-group">
              <label>Confirm password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input type={showPassword ? 'text' : 'password'} className="input-field" placeholder="Repeat your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field !pr-10"
                placeholder={isRegisterMode ? 'At least 8 characters' : 'Enter password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 text-[var(--text-dim)] hover:text-[var(--text-main)]"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
            {loading
              ? 'Authenticating Session...'
              : isRegisterMode
              ? 'Create account'
              : 'Sign in to PlantGuard'}
          </button>

          {!isRegisterMode && (
            <div className="demo-credentials-box">
              <div className="demo-credentials-header">
                <Sparkles size={14} className="demo-sparkle" />
                <span>Pre-Configured Evaluation Profile</span>
              </div>
              <p className="demo-credentials-text">
                Quick evaluator account: <code>admin</code> / <code>admin123</code>
              </p>
              <button
                type="button"
                className="btn btn-secondary demo-fill-btn"
                onClick={handleFillDemo}
              >
                Auto-fill Demo Credentials
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
