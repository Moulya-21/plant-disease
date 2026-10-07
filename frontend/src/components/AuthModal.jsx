import React, { useState } from 'react';
import { X, Lock, User, KeyRound, Sparkles, AlertCircle } from 'lucide-react';
import { login, register } from '../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        await register(username, password);
        setSuccessMsg('Account created successfully! Signing you in...');
        const loginData = await login(username, password);
        onAuthSuccess(loginData.user);
        onClose();
      } else {
        const loginData = await login(username, password);
        onAuthSuccess(loginData.user);
        onClose();
      }
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <KeyRound className="modal-icon" size={22} />
            <h2>{isRegisterMode ? 'Create Agronomist Account' : 'Agronomist Authentication'}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

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
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-success-banner">
            <Sparkles size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                type="text"
                className="input-field"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                className="input-field"
                placeholder={isRegisterMode ? 'At least 8 characters' : 'Enter password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
            {loading
              ? 'Authenticating...'
              : isRegisterMode
              ? 'Create Account & Access'
              : 'Sign In to PlantGuard'}
          </button>

          {!isRegisterMode && (
            <div className="demo-credentials-box">
              <div className="demo-credentials-header">
                <Sparkles size={14} className="demo-sparkle" />
                <span>Quick Evaluation Demo Account</span>
              </div>
              <p className="demo-credentials-text">
                Pre-configured administrator account: <code>admin</code> / <code>admin123</code>
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
