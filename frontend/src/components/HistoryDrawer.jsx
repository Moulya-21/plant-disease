import React, { useState } from 'react';
import {
  X,
  History,
  Calendar,
  CheckCircle,
  ShieldAlert,
  Search,
  Bookmark,
  Trash2,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function HistoryDrawer() {
  const {
    historyDrawerOpen,
    setHistoryDrawerOpen,
    historyRecords,
    historyLoading,
    bookmarkedIds,
    toggleBookmark,
    optimisticDeleteRecord,
  } = useApp();

  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'diseased' | 'healthy' | 'bookmarked'

  if (!historyDrawerOpen) return null;

  const filteredRecords = historyRecords.filter((rec) => {
    const isHealthy = rec.predicted_class.toLowerCase().includes('healthy');
    const isBookmarked = bookmarkedIds.includes(rec.id);
    const matchesQuery = rec.predicted_class.toLowerCase().includes(query.toLowerCase());

    if (!matchesQuery) return false;
    if (filterType === 'diseased') return !isHealthy;
    if (filterType === 'healthy') return isHealthy;
    if (filterType === 'bookmarked') return isBookmarked;
    return true;
  });

  return (
    <div className="drawer-backdrop" onClick={() => setHistoryDrawerOpen(false)}>
      <div className="drawer-panel glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title-wrap">
            <History size={22} className="drawer-title-icon" />
            <div>
              <h3>Agronomic Audit History</h3>
              <p className="drawer-subtitle">
                {historyRecords.length} Persisted SQLite Records
              </p>
            </div>
          </div>
          <button
            className="modal-close-btn"
            onClick={() => setHistoryDrawerOpen(false)}
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="drawer-filter-bar">
          <div className="input-with-icon">
            <Search size={15} className="input-icon" />
            <input
              type="text"
              className="input-field !py-2 !text-xs"
              placeholder="Search diagnosis history..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-1.5 mt-2">
            {['all', 'diseased', 'healthy', 'bookmarked'].map((type) => (
              <button
                key={type}
                className={`drawer-filter-chip ${filterType === type ? 'active' : ''}`}
                onClick={() => setFilterType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Record List */}
        <div className="drawer-body">
          {historyLoading ? (
            <div className="drawer-empty-state">
              <span className="spinner-dot" />
              <p>Fetching authenticated records from SQLite...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="drawer-empty-state">
              <History size={38} className="empty-icon" />
              <h4>No Diagnostic Records Found</h4>
              <p>
                {query || filterType !== 'all'
                  ? 'No records match your active query or filter.'
                  : 'Run foliage diagnoses while authenticated to build your field audit trail.'}
              </p>
            </div>
          ) : (
            <div className="history-records-list">
              {filteredRecords.map((rec) => {
                const isHealthy = rec.predicted_class.toLowerCase().includes('healthy');
                const isBookmarked = bookmarkedIds.includes(rec.id);
                const confPercent = (rec.confidence * 100).toFixed(1);
                const dateFormatted = new Date(rec.created_at).toLocaleString();

                return (
                  <div key={rec.id} className="history-item glass-panel animate-fade-in">
                    <div className="history-item-top">
                      <div className="history-class-wrap">
                        {isHealthy ? (
                          <CheckCircle size={16} className="hist-icon-healthy" />
                        ) : (
                          <ShieldAlert size={16} className="hist-icon-diseased" />
                        )}
                        <span className="history-class-name">{rec.predicted_class}</span>
                      </div>
                      <span className={`badge ${isHealthy ? 'badge-success' : 'badge-warning'}`}>
                        {confPercent}%
                      </span>
                    </div>

                    <div className="history-item-bottom">
                      <div className="history-date">
                        <Calendar size={13} />
                        <span>{dateFormatted}</span>
                      </div>

                      {/* Action buttons (Bookmark & Optimistic Delete) */}
                      <div className="flex items-center gap-1">
                        <button
                          className={`history-action-btn ${isBookmarked ? 'bookmarked' : ''}`}
                          onClick={() => toggleBookmark(rec.id)}
                          title={isBookmarked ? 'Remove bookmark' : 'Bookmark record'}
                        >
                          <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          className="history-action-btn delete-btn"
                          onClick={() => optimisticDeleteRecord(rec.id)}
                          title="Delete record (optimistic with undo)"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
