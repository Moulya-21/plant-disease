import React from 'react';
import { Target, Layers, Eye, Database } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function ModelStats() {
  const { historyRecords, serverStatus } = useApp();

  const stats = [
    {
      icon: <Target size={20} className="stat-icon-emerald" />,
      label: "Diagnostic Classes",
      value: "38 Pathologies",
      subtext: "Tomato, Corn, Apple, Potato & more"
    },
    {
      icon: <Layers size={20} className="stat-icon-cyan" />,
      label: "Model Benchmark",
      value: "97.35% Test Accuracy",
      subtext: "Custom Deep CNN (224×224 px)"
    },
    {
      icon: <Eye size={20} className="stat-icon-amber" />,
      label: "Explainable AI",
      value: "Grad-CAM Heatmap",
      subtext: "Pixel-level lesion localization"
    },
    {
      icon: <Database size={20} className="stat-icon-purple" />,
      label: "Diagnostic Ledger",
      value: `${historyRecords.length} Saved Records`,
      subtext: serverStatus === 'ok' ? 'SQLite Connected & Active' : 'Connecting to DB...'
    }
  ];

  return (
    <div className="stats-grid">
      {stats.map((item, index) => (
        <div key={index} className="stat-card glass-panel">
          <div className="stat-icon-wrap">{item.icon}</div>
          <div className="stat-content">
            <span className="stat-label">{item.label}</span>
            <div className="stat-value">{item.value}</div>
            <span className="stat-subtext">{item.subtext}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
