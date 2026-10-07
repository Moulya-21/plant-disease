import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { getAdvisoryForClass } from '../diseaseInfo';

export default function PredictionResult({ result, gradcamImage }) {
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!result) return null;

  const { prediction, top_predictions, all_predictions } = result;
  const confidencePercent = (prediction.confidence * 100).toFixed(1);
  const isHealthy = prediction.class_name.toLowerCase().includes('healthy');
  const isLowConfidence = prediction.confidence < 0.6;
  const advisory = getAdvisoryForClass(prediction.class_name);

  const filteredAllClasses = (all_predictions || []).filter((item) =>
    item.class_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="result-container animate-fade-in">
      {/* Primary Diagnosis Card */}
      <div className={`diagnosis-banner glass-panel ${isHealthy ? 'banner-healthy' : 'banner-diseased'}`}>
        <div className="diagnosis-banner-content">
          <div className="diagnosis-header-row">
            <div className="diagnosis-icon-wrapper">
              {isHealthy ? (
                <CheckCircle2 size={36} className="diag-icon diag-icon-healthy" />
              ) : (
                <ShieldAlert size={36} className="diag-icon diag-icon-diseased" />
              )}
            </div>

            <div className="diagnosis-title-wrapper">
              <div className="diagnosis-tags">
                <span className={`badge ${isHealthy ? 'badge-success' : 'badge-warning'}`}>
                  {isHealthy ? 'Optimal Plant Health' : 'Pathology Detected'}
                </span>
                <span className="badge badge-neutral">Inference Confidence: {confidencePercent}%</span>
              </div>
              <h2 className="primary-diagnosis-title">{prediction.class_name}</h2>
            </div>
          </div>

          {isLowConfidence && (
            <div className="low-confidence-alert">
              <AlertTriangle size={18} className="alert-icon" />
              <div>
                <strong>Low Confidence Advisory ({confidencePercent}%):</strong>
                <span>
                  {' '}The neural confidence is below 60%. Please verify lighting, ensure leaf focus, or consult with an agricultural extension officer.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grad-CAM Explainable AI Visualizer (if generated) */}
      {gradcamImage && (
        <div className="gradcam-card glass-panel">
          <div className="gradcam-header">
            <div className="gradcam-title-wrap">
              <Flame size={20} className="gradcam-icon" />
              <h3>Explainable AI: Grad-CAM Activation Map</h3>
            </div>
            <span className="badge badge-neutral">Layer: conv2d_2</span>
          </div>
          <p className="gradcam-desc">
            Visual explanation displaying the exact convolutional feature regions of the leaf that led the neural model to this diagnostic classification.
          </p>
          <div className="gradcam-image-display">
            <img src={gradcamImage} alt="Grad-CAM Visualization" className="gradcam-img" />
          </div>
        </div>
      )}

      {/* Top-3 Candidates & Distribution */}
      <div className="top-candidates-card glass-panel">
        <div className="card-section-header">
          <Activity size={18} className="header-icon" />
          <h3>Top Candidate Classifications</h3>
        </div>

        <div className="candidate-list">
          {top_predictions.map((candidate, idx) => {
            const prob = (candidate.confidence * 100).toFixed(2);
            return (
              <div key={idx} className="candidate-row">
                <div className="candidate-meta">
                  <span className="candidate-rank">#{idx + 1}</span>
                  <span className="candidate-name">{candidate.class_name}</span>
                  <span className="candidate-score">{prob}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${prob}%`,
                      background:
                        idx === 0
                          ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                          : 'linear-gradient(90deg, #059669 0%, #10b981 100%)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agronomic Advisory and Treatment Protocol */}
      <div className="advisory-card glass-panel">
        <div className="card-section-header">
          <Sparkles size={18} className="header-icon" />
          <h3>Agronomic Advisory & Treatment Protocol</h3>
        </div>

        <p className="advisory-description">{advisory.description}</p>

        <div className="treatment-grid">
          <div className="treatment-item treatment-action">
            <div className="treatment-label">Immediate Agronomic Actions</div>
            <p className="treatment-text">{advisory.action}</p>
          </div>

          <div className="treatment-item treatment-organic">
            <div className="treatment-label">🌱 Organic & Biological Remedies</div>
            <p className="treatment-text">{advisory.organic}</p>
          </div>

          <div className="treatment-item treatment-chemical">
            <div className="treatment-label">🧪 Chemical & Preventative Treatments</div>
            <p className="treatment-text">{advisory.chemical}</p>
          </div>
        </div>
      </div>

      {/* Complete 38 Disease Probability Spectrum Accordion */}
      {all_predictions && all_predictions.length > 0 && (
        <div className="all-classes-accordion glass-panel">
          <button
            type="button"
            className="accordion-toggle-btn"
            onClick={() => setShowAllClasses(!showAllClasses)}
          >
            <div className="accordion-toggle-title">
              <Layers size={18} />
              <span>Full 38-Class Neural Softmax Spectrum</span>
              <span className="badge badge-neutral">{all_predictions.length} Total</span>
            </div>
            {showAllClasses ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {showAllClasses && (
            <div className="accordion-content animate-fade-in">
              <input
                type="text"
                className="input-field spectrum-search"
                placeholder="Filter among 38 crop disease classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <div className="spectrum-list">
                {filteredAllClasses.map((item, idx) => {
                  const prob = (item.confidence * 100).toFixed(3);
                  return (
                    <div key={idx} className="spectrum-item">
                      <span className="spectrum-name">{item.class_name}</span>
                      <span className="spectrum-prob">{prob}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
