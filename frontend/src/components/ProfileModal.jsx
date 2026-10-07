import React from 'react';
import { CalendarDays, Mail, UserRound, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ProfileModal() {
  const { user, profileOpen, setProfileOpen, historyRecords } = useApp();
  if (!profileOpen || !user) return null;
  const created = user.created_at ? new Date(user.created_at).toLocaleDateString() : '—';
  return <div className="modal-backdrop" onClick={() => setProfileOpen(false)}>
    <section className="modal-card glass-panel profile-card" onClick={(event) => event.stopPropagation()} aria-label="User profile">
      <div className="modal-header"><div className="modal-title-wrap"><UserRound className="modal-icon" size={22} /><h2>Your profile</h2></div><button className="modal-close-btn" onClick={() => setProfileOpen(false)} aria-label="Close profile"><X size={18} /></button></div>
      <p className="profile-intro">Account details and private analysis activity.</p>
      <dl className="profile-details">
        <div><dt><UserRound size={15} /> Full name</dt><dd>{user.full_name || user.username}</dd></div>
        <div><dt><Mail size={15} /> Email</dt><dd>{user.email || 'Not provided'}</dd></div>
        <div><dt><UserRound size={15} /> Username</dt><dd>{user.username}</dd></div>
        <div><dt><CalendarDays size={15} /> Member since</dt><dd>{created}</dd></div>
      </dl>
      <div className="profile-count"><strong>{historyRecords.length}</strong><span>saved predictions in this session</span></div>
    </section>
  </div>;
}
