import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, RefreshCw, Zap, Eye, AlertCircle } from 'lucide-react';

export default function ImageUploader({
  onAnalyze,
  onGradCam,
  loading,
  analyzingType,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Generate synthetic sample leaves using canvas for instant testing
  const handleLoadSample = (sampleType) => {
    const canvas = document.createElement('canvas');
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#101d18';
    ctx.fillRect(0, 0, 224, 224);

    // Leaf stem & body
    ctx.beginPath();
    ctx.ellipse(112, 112, 75, 95, Math.PI / 8, 0, 2 * Math.PI);

    if (sampleType === 'tomato_blight') {
      ctx.fillStyle = '#4a6730';
      ctx.fill();
      // Blight spots
      ctx.fillStyle = '#3a2010';
      ctx.beginPath();
      ctx.arc(80, 90, 18, 0, 2 * Math.PI);
      ctx.arc(130, 140, 22, 0, 2 * Math.PI);
      ctx.arc(105, 110, 14, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#c49a45';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (sampleType === 'corn_rust') {
      ctx.fillStyle = '#658d3c';
      ctx.fill();
      // Rust pustules
      ctx.fillStyle = '#b45309';
      for (let i = 0; i < 15; i++) {
        ctx.beginPath();
        ctx.arc(60 + (i % 4) * 28, 50 + Math.floor(i / 4) * 35, 6, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else {
      // Healthy Green leaf
      const grad = ctx.createLinearGradient(40, 40, 180, 180);
      grad.addColorStop(0, '#22c55e');
      grad.addColorStop(1, '#15803d');
      ctx.fillStyle = grad;
      ctx.fill();

      // Leaf veins
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(112, 30);
      ctx.lineTo(112, 190);
      ctx.stroke();
    }

    canvas.toBlob((blob) => {
      const file = new File([blob], `${sampleType}_test_sample.png`, {
        type: 'image/png',
      });
      handleFileChange(file);
    }, 'image/png');
  };

  return (
    <div className="uploader-card glass-panel">
      <div className="uploader-header">
        <div className="section-title-wrap">
          <ImageIcon className="section-title-icon" size={20} />
          <h2>Leaf Specimen Ingestion</h2>
        </div>
        <p className="section-desc">
          Upload an agronomic foliage photo or select a calibrated sample specimen to evaluate.
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileChange(e.target.files[0])}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {!previewUrl ? (
        <div
          className={`dropzone ${isDragging ? 'dropzone-active' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          <div className="dropzone-icon-wrap">
            <UploadCloud size={40} className="dropzone-icon" />
          </div>
          <h3 className="dropzone-title">Drag & drop high-resolution foliage image here</h3>
          <p className="dropzone-subtitle">Supported formats: JPG, PNG, WEBP (Max 12 MB)</p>
          <button type="button" className="btn btn-secondary browse-btn">
            Browse Filesystem
          </button>
        </div>
      ) : (
        <div className="preview-container">
          <div className="preview-image-wrapper">
            <img src={previewUrl} alt="Leaf Preview" className="preview-image" />
            {loading && (
              <div className="scanning-overlay">
                <div className="scanning-beam" />
                <div className="scanning-text">
                  <RefreshCw size={20} className="spinner-icon" />
                  <span>
                    {analyzingType === 'gradcam'
                      ? 'Generating Grad-CAM Attribution Heatmap...'
                      : 'Running Multi-Class Neural Inference...'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="preview-meta-bar">
            <div className="preview-file-info">
              <span className="file-name">{selectedFile?.name}</span>
              <span className="file-size">
                {selectedFile?.size ? (selectedFile.size / 1024).toFixed(1) + ' KB' : ''}
              </span>
            </div>
            <button
              className="btn btn-secondary reset-btn"
              onClick={handleClear}
              disabled={loading}
            >
              <RefreshCw size={14} />
              <span>Replace Image</span>
            </button>
          </div>
        </div>
      )}

      <div className="sample-test-bar">
        <span className="sample-label">
          <Sparkles size={14} /> Quick Benchmark Specimens:
        </span>
        <div className="sample-buttons">
          <button
            type="button"
            className="sample-btn"
            onClick={() => handleLoadSample('tomato_blight')}
            disabled={loading}
          >
            🍅 Tomato Blight Sample
          </button>
          <button
            type="button"
            className="sample-btn"
            onClick={() => handleLoadSample('corn_rust')}
            disabled={loading}
          >
            🌽 Corn Rust Sample
          </button>
          <button
            type="button"
            className="sample-btn"
            onClick={() => handleLoadSample('healthy')}
            disabled={loading}
          >
            🌿 Pristine Healthy Foliage
          </button>
        </div>
      </div>

      <div className="action-buttons-grid">
        <button
          className="btn btn-primary run-inference-btn"
          onClick={() => selectedFile && onAnalyze(selectedFile)}
          disabled={!selectedFile || loading}
        >
          <Zap size={18} />
          <span>Run Neural Disease Diagnosis</span>
        </button>

        <button
          className="btn btn-secondary run-gradcam-btn"
          onClick={() => selectedFile && onGradCam(selectedFile)}
          disabled={!selectedFile || loading}
        >
          <Eye size={18} />
          <span>Explain with Grad-CAM</span>
        </button>
      </div>
    </div>
  );
}
