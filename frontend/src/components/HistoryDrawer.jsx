import React from 'react';
import { X, History, Calendar, CheckCircle, ShieldAlert, AlertCircle } from 'lucide-react';

export default function HistoryDrawer({ isOpen, onClose, historyList, loading }) {
  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-wrap">
            <History size={22} className="drawer-title-icon" />
            <div>
              <h3>Agronomic Audit History</h3>
              <p className="drawer-subtitle">Persisted SQLite Inferences</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {loading ? (
            <div className="drawer-empty-state">
              <span className="spinner-dot" />
              <p>Loading historical diagnostic records...</p>
            </div>
          ) : historyList.length === 0 ? (
            <div className="drawer-empty-state">
              <History size={36} className="empty-icon" />
              <h4>No Recorded Diagnoses Yet</h4>
              <p>Run a leaf diagnosis while authenticated to persist records to the SQLite database.</p>
            </div>
          ) : (
            <div className="history-records-list">
              {historyList.map((rec) => {
                const isHealthy = rec.predicted_class.toLowerCase().includes('healthy');
                const confPercent = (rec.confidence * 100).toFixed(1);
                const dateFormatted = new Date(rec.created_at).toLocaleString();

                return (
                  <div key={rec.id} className="history-item glass-panel">
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
                      <span className="history-id">#Record-{rec.id}</span>
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
