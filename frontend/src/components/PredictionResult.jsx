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
  Printer,
  FileText,
  BadgeAlert,
  Sprout,
} from 'lucide-react';
import { getAdvisoryForClass } from '../diseaseInfo';
import GradCamViewer from './GradCamViewer';
import { useApp } from '../context/AppContext';

export default function PredictionResult() {
  const {
    predictionResult,
    gradcamImage,
    gradcamImages,
    previewUrl,
    isInferring,
    inferringType,
  } = useApp();

  const [activeTab, setActiveTab] = useState('immediate');
  const [showSpectrum, setShowSpectrum] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Loading Skeleton State to eliminate Cumulative Layout Shift (CLS)
  if (isInferring && !predictionResult) {
    return (
      <div className="result-container animate-fade-in">
        <div className="glass-panel p-6 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl skeleton" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="w-32 h-5 skeleton" />
              <div className="w-64 h-8 skeleton" />
            </div>
          </div>
          <div className="w-full h-10 skeleton" />
        </div>

        <div className="glass-panel p-6 flex flex-col gap-3">
          <div className="w-48 h-6 skeleton" />
          <div className="w-full h-12 skeleton" />
          <div className="w-full h-12 skeleton" />
        </div>
      </div>
    );
  }

  if (!predictionResult) return null;

  const { prediction, top_predictions, all_predictions } = predictionResult;
  const confidencePercent = (prediction.confidence * 100).toFixed(1);
  const isLowConfidence = prediction.confidence < 0.6;
  const isHealthy = !isLowConfidence && prediction.class_name.toLowerCase().includes('healthy');
  const advisory = getAdvisoryForClass(prediction.class_name);

  const filteredSpectrum = (all_predictions || []).filter((item) =>
    item.class_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="result-container animate-fade-in">
      {/* Primary Diagnosis Hero Card */}
      <div
        className={`diagnosis-banner glass-panel ${
          isHealthy ? 'banner-healthy' : 'banner-diseased'
        }`}
      >
        <div className="diagnosis-banner-content">
          <div className="diagnosis-header-row">
            <div className="diagnosis-icon-wrapper">
              {isHealthy ? (
                <CheckCircle2 size={38} className="diag-icon diag-icon-healthy" />
              ) : (
                <ShieldAlert size={38} className="diag-icon diag-icon-diseased" />
              )}
            </div>

            <div className="diagnosis-title-wrapper flex-1">
              <div className="diagnosis-tags">
                <span className={`badge ${isHealthy ? 'badge-success' : 'badge-warning'}`}>
                  {isLowConfidence ? 'Review required' : isHealthy ? 'Healthy leaf detected' : 'Possible pathology detected'}
                </span>
                <span className="badge badge-neutral">Inference Confidence: {confidencePercent}%</span>
                {prediction.severity_percentage !== undefined && (
                  <span className={`badge ${prediction.severity_percentage > 35 ? 'badge-danger' : prediction.severity_percentage > 0 ? 'badge-warning' : 'badge-success'}`}>
                    Lesion Area: {prediction.severity_percentage}% ({prediction.severity_grade})
                  </span>
                )}
                {predictionResult.quality_metrics && (
                  <span className={`badge ${predictionResult.quality_metrics.is_foliage_likely ? 'badge-success' : 'badge-warning'}`}>
                    Foliage Gate: {predictionResult.quality_metrics.quality_rating}
                  </span>
                )}
                {predictionResult.tta_enabled && (
                  <span className="badge badge-neutral">TTA 4x Active</span>
                )}
                {predictionResult.cached && (
                  <span className="badge badge-neutral">Instant Cache ⚡</span>
                )}
              </div>
              <h2 className="primary-diagnosis-title">{isLowConfidence ? 'Inconclusive analysis' : prediction.class_name}</h2>
            </div>


            <button
              className="btn btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5 self-start"
              onClick={handlePrintSlip}
              title="Print Agronomic Prescription Slip"
            >
              <Printer size={14} />
              <span>Export Slip</span>
            </button>
          </div>

          {isLowConfidence && (
            <div className="low-confidence-alert">
              <AlertTriangle size={18} className="alert-icon" />
              <div>
                <strong>Low Neural Certainty ({confidencePercent}%):</strong>
                <span>
                  {' '}The model cannot reliably classify this image. Upload a clear, single leaf photographed against a simple background before acting on this result.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grad-CAM Attribution Heatmap with Interactive Slider */}
      {gradcamImage && (
        <GradCamViewer
          originalUrl={gradcamImages?.original || previewUrl}
          heatmapImage={gradcamImages?.heatmap || gradcamImage}
          overlayImage={gradcamImages?.overlay || gradcamImage}
          className={prediction.class_name}
        />
      )}

      {/* Candidate Softmax Distribution */}
      <div className="top-candidates-card glass-panel">
        <div className="card-section-header">
          <Activity size={18} className="header-icon" />
          <h3>Primary Softmax Candidates</h3>
        </div>

        <div className="candidate-list">
          {top_predictions.map((candidate, idx) => {
            const prob = (candidate.confidence * 100).toFixed(2);
            return (
              <div key={idx} className="candidate-row">
                <div className="candidate-meta">
                  <span className="candidate-rank">0{idx + 1}</span>
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

      {/* Comprehensive Agronomic Prescription & Advisory Tabs */}
      <div className="advisory-card glass-panel">
        <div className="card-section-header">
          <Sparkles size={18} className="header-icon" />
          <h3>Agronomic Advisory & Treatment Protocol</h3>
        </div>

        <p className="advisory-description">{advisory.description}</p>

        {/* Advisory Tabs */}
        <div className="advisory-nav-tabs">
          <button
            className={`adv-tab ${activeTab === 'immediate' ? 'active' : ''}`}
            onClick={() => setActiveTab('immediate')}
          >
            Immediate Actions
          </button>
          <button
            className={`adv-tab ${activeTab === 'organic' ? 'active' : ''}`}
            onClick={() => setActiveTab('organic')}
          >
            🌱 Organic Remedies
          </button>
          <button
            className={`adv-tab ${activeTab === 'chemical' ? 'active' : ''}`}
            onClick={() => setActiveTab('chemical')}
          >
            🧪 Chemical Controls
          </button>
        </div>

        <div className="advisory-tab-content animate-fade-in">
          {activeTab === 'immediate' && (
            <div className="treatment-item treatment-action">
              <div className="treatment-label">Agronomic Field Protocol</div>
              <p className="treatment-text">{advisory.action}</p>
            </div>
          )}

          {activeTab === 'organic' && (
            <div className="treatment-item treatment-organic">
              <div className="treatment-label">Biological & Organic Measures</div>
              <p className="treatment-text">{advisory.organic}</p>
            </div>
          )}

          {activeTab === 'chemical' && (
            <div className="treatment-item treatment-chemical">
              <div className="treatment-label">Chemical Fungicide / Bactericide Treatments</div>
              <p className="treatment-text">{advisory.chemical}</p>
            </div>
          )}
        </div>
      </div>

      {/* Full 38-Class Neural Spectrum Explorer */}
      {all_predictions && all_predictions.length > 0 && (
        <div className="all-classes-accordion glass-panel">
          <button
            type="button"
            className="accordion-toggle-btn"
            onClick={() => setShowSpectrum(!showSpectrum)}
          >
            <div className="accordion-toggle-title">
              <Layers size={18} />
              <span>Full 38-Class Neural Softmax Spectrum</span>
              <span className="badge badge-neutral">{all_predictions.length} Total Classes</span>
            </div>
            {showSpectrum ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {showSpectrum && (
            <div className="accordion-content animate-fade-in">
              <input
                type="text"
                className="input-field spectrum-search"
                placeholder="Search across 38 crop disease classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <div className="spectrum-list">
                {filteredSpectrum.map((item, idx) => {
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
