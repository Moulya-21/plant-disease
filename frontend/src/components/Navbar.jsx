import React from 'react';
import { Leaf, ShieldCheck, LogIn, LogOut, History, Cpu } from 'lucide-react';

export default function Navbar({
  user,
  onOpenAuth,
  onLogout,
  onOpenHistory,
  serverStatus,
  modelInfo,
}) {
  return (
    <header className="navbar glass-panel">
      <div className="navbar-left">
        <div className="brand-logo">
          <div className="logo-icon-wrap">
            <Leaf className="logo-icon" size={24} />
          </div>
          <div>
            <h1 className="brand-title">PlantGuard <span className="brand-badge">AI</span></h1>
            <p className="brand-subtitle">Deep Learning Agronomic Diagnosis</p>
          </div>
        </div>
      </div>

      <div className="navbar-center">
        <div className="status-pill">
          <span
            className={`status-dot ${
              serverStatus === 'ok' ? 'status-online' : 'status-offline'
            }`}
          />
          <span className="status-label">
            {serverStatus === 'ok' ? 'FastAPI Engine Active' : 'API Connecting...'}
          </span>
        </div>

        {modelInfo && (
          <div className="model-chip">
            <Cpu size={14} className="model-chip-icon" />
            <span>38 Classes • Custom CNN 95.5%</span>
          </div>
        )}
      </div>

      <div className="navbar-right">
        {user ? (
          <div className="user-nav-actions">
            <button
              className="btn btn-secondary nav-btn"
              onClick={onOpenHistory}
              title="View past diagnosis history"
            >
              <History size={16} />
              <span>History</span>
            </button>

            <div className="user-badge">
              <ShieldCheck size={16} className="user-icon" />
              <span className="user-name">{user.username}</span>
              <span className="user-role-tag">{user.role}</span>
            </div>

            <button
              className="btn btn-secondary nav-btn logout-btn"
              onClick={onLogout}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button className="btn btn-primary nav-login-btn" onClick={onOpenAuth}>
            <LogIn size={16} />
            <span>Sign In / Demo</span>
          </button>
        )}
      </div>
    </header>
  );
}
