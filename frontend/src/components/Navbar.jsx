import React from 'react';
import { Leaf, ShieldCheck, LogIn, LogOut, History, Cpu, Sun, Moon, UserRound } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Navbar() {
  const {
    user,
    setAuthModalOpen,
    handleLogout,
    setHistoryDrawerOpen,
    historyRecords,
    serverStatus,
    modelInfo,
    theme,
    toggleTheme,
    setProfileOpen,
  } = useApp();

  return (
    <header className="navbar glass-panel">
      {/* Brand Section */}
      <div className="navbar-left">
        <div className="brand-logo">
          <div className="logo-icon-wrap">
            <Leaf className="logo-icon" size={24} />
          </div>
          <div>
            <h1 className="brand-title">
              PlantGuard <span className="brand-badge">AI</span>
            </h1>
            <p className="brand-subtitle">Autonomous Agronomic Diagnosis</p>
          </div>
        </div>
      </div>

      {user ? <div className="navbar-center">
        <div className="status-pill">
          <span
            className={`status-dot ${
              serverStatus === 'ok' ? 'status-online' : 'status-offline'
            }`}
          />
          <span className="status-label">
            {serverStatus === 'ok' ? 'FastAPI Neural Engine Live' : 'API Connecting...'}
          </span>
        </div>

        <div className="model-chip">
          <Cpu size={14} className="model-chip-icon" />
          <span>38 Classes • Custom CNN 97.35%</span>
        </div>
      </div> : <nav className="navbar-center public-nav" aria-label="Primary navigation">
        <a href="#home">Home</a><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#technology">Model</a>
      </nav>}

      {/* Right Actions & Theme Switcher */}
      <div className="navbar-right">
        {/* Dark/Light Mode Switcher */}
        <button
          className="btn btn-secondary theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle visual theme"
        >
          {theme === 'dark' ? (
            <Sun size={17} className="text-amber-400" />
          ) : (
            <Moon size={17} className="text-emerald-600" />
          )}
        </button>

        {user ? (
          <div className="user-nav-actions">
            <button
              className="btn btn-secondary nav-btn relative"
              onClick={() => setHistoryDrawerOpen(true)}
              title="View past diagnosis audit trail"
            >
              <History size={16} />
              <span>Audit Trail</span>
              {historyRecords.length > 0 && (
                <span className="history-count-badge">{historyRecords.length}</span>
              )}
            </button>

            <div className="user-badge">
              <ShieldCheck size={16} className="user-icon" />
              <span className="user-name">{user.username}</span>
              <span className="user-role-tag">{user.role}</span>
            </div>

            <button className="btn btn-secondary nav-btn" onClick={() => setProfileOpen(true)} title="View profile">
              <UserRound size={16} /><span>Profile</span>
            </button>

            <button
              className="btn btn-secondary nav-btn logout-btn"
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            className="btn btn-primary nav-login-btn"
            onClick={() => setAuthModalOpen(true)}
          >
            <LogIn size={16} />
            <span>Login</span>
          </button>
        )}
      </div>
    </header>
  );
}
