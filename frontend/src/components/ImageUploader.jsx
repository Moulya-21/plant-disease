import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Zap,
  Eye,
  CheckCircle2,
  FileCheck,
  Crop,
  Camera,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import CameraCapture from './CameraCapture';


export default function ImageUploader() {
  const {
    selectedFile,
    previewUrl,
    selectSpecimen,
    clearSpecimen,
    isInferring,
    inferringType,
    runPrediction,
    runGradCam,
  } = useApp();

  const [isDragging, setIsDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [imageMeta, setImageMeta] = useState(null);
  const fileInputRef = useRef(null);


  useEffect(() => {
    if (!previewUrl) {
      setImageMeta(null);
      return;
    }
    const img = new Image();
    img.src = previewUrl;
    img.onload = () => {
      setImageMeta({ width: img.naturalWidth, height: img.naturalHeight });
    };
  }, [previewUrl]);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a standard foliage image file (JPEG, PNG, WEBP).');
      return;
    }
    selectSpecimen(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const generateSyntheticSpecimen = (type) => {
    const canvas = document.createElement('canvas');
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext('2d');

    // Neutral dark leaf background
    ctx.fillStyle = '#0c1612';
    ctx.fillRect(0, 0, 224, 224);

    // Foliage base shape
    ctx.beginPath();
    ctx.ellipse(112, 112, 75, 96, Math.PI / 7, 0, 2 * Math.PI);

    if (type === 'tomato_blight') {
      ctx.fillStyle = '#415c2a';
      ctx.fill();
      // Concentric target spots
      const spots = [
        { x: 80, y: 85, r: 18 },
        { x: 135, y: 135, r: 24 },
        { x: 105, y: 110, r: 15 },
      ];
      spots.forEach((s) => {
        ctx.fillStyle = '#26150a';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3;
        ctx.stroke();
      });
    } else if (type === 'corn_rust') {
      ctx.fillStyle = '#5c7f34';
      ctx.fill();
      // Orange/rust pustules
      ctx.fillStyle = '#b45309';
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.arc(60 + (i % 4) * 26, 45 + Math.floor(i / 4) * 32, 5.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else {
      // Pristine healthy green leaf
      const grad = ctx.createLinearGradient(40, 40, 180, 180);
      grad.addColorStop(0, '#22c55e');
      grad.addColorStop(1, '#15803d');
      ctx.fillStyle = grad;
      ctx.fill();

      // Vein network
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(112, 25);
      ctx.lineTo(112, 195);
      ctx.stroke();
    }

    canvas.toBlob((blob) => {
      const specimenFile = new File([blob], `${type}_specimen.png`, { type: 'image/png' });
      handleFile(specimenFile);
    }, 'image/png');
  };

  return (
    <div className="uploader-card glass-panel">
      <div className="uploader-header">
        <div className="section-title-wrap">
          <ImageIcon className="section-title-icon" size={20} />
          <h2>Specimen Input & Acquisition</h2>
        </div>
        <p className="section-desc">
          Capture or upload foliage imagery for multi-class convolutional inference.
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFile(e.target.files[0])}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {!previewUrl ? (
        <div
          className={`dropzone ${isDragging ? 'dropzone-active' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="dropzone-icon-wrap">
            <UploadCloud size={42} className="dropzone-icon" />
          </div>
          <h3 className="dropzone-title">Drag & drop leaf specimen or browse</h3>
          <p className="dropzone-subtitle">Accepts JPG, PNG, WEBP (Max 12 MB • 224×224 normalized)</p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <button
              type="button"
              className="btn btn-secondary browse-btn"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose Specimen File
            </button>
            <button
              type="button"
              className="btn btn-primary browse-btn flex items-center gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                setCameraOpen(true);
              }}
            >
              <Camera size={15} />
              <span>Open Field Camera</span>
            </button>
          </div>
        </div>

      ) : (
        <div className="preview-container animate-fade-in">
          <div className="preview-image-wrapper">
            <img src={previewUrl} alt="Leaf Preview" className="preview-image" />
            {isInferring && (
              <div className="scanning-overlay">
                <div className="scanning-beam" />
                <div className="scanning-text">
                  <RefreshCw size={22} className="spinner-icon" />
                  <span>
                    {inferringType === 'gradcam'
                      ? 'Synthesizing Grad-CAM Attribution Heatmap...'
                      : 'Executing Deep Neural Tensor Inference...'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="preview-meta-bar">
            <div className="preview-file-info">
              <FileCheck size={16} className="text-emerald-500" />
              <span className="file-name">{selectedFile?.name}</span>
              {imageMeta && (
                <span className="file-size">
                  ({imageMeta.width}×{imageMeta.height} px)
                </span>
              )}
            </div>
            <button
              className="btn btn-secondary reset-btn"
              onClick={clearSpecimen}
              disabled={isInferring}
              title="Replace specimen"
            >
              <RefreshCw size={14} />
              <span>Replace</span>
            </button>
          </div>
        </div>
      )}

      {/* Benchmark Specimen Chips */}
      <div className="sample-test-bar">
        <span className="sample-label">
          <Sparkles size={14} /> Instant Benchmark Calibration:
        </span>
        <div className="sample-buttons">
          <button
            type="button"
            className="sample-btn"
            onClick={() => generateSyntheticSpecimen('tomato_blight')}
            disabled={isInferring}
          >
            🍅 Tomato Blight
          </button>
          <button
            type="button"
            className="sample-btn"
            onClick={() => generateSyntheticSpecimen('corn_rust')}
            disabled={isInferring}
          >
            🌽 Corn Common Rust
          </button>
          <button
            type="button"
            className="sample-btn"
            onClick={() => generateSyntheticSpecimen('healthy')}
            disabled={isInferring}
          >
            🌿 Pristine Foliage
          </button>
        </div>
      </div>

      {/* Dual Diagnostic Triggers */}
      <div className="action-buttons-grid">
        <button
          className="btn btn-primary run-inference-btn"
          onClick={() => runPrediction()}
          disabled={!selectedFile || isInferring}
        >
          <Zap size={18} />
          <span>{isInferring && inferringType === 'predict' ? 'Inference Running...' : 'Neural Classification'}</span>
        </button>

        <button
          className="btn btn-secondary run-gradcam-btn"
          onClick={() => runGradCam()}
          disabled={!selectedFile || isInferring}
        >
          <Eye size={18} />
          <span>{isInferring && inferringType === 'gradcam' ? 'Calculating Heatmap...' : 'Explainable Grad-CAM'}</span>
        </button>
      </div>

      <CameraCapture
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
      />
    </div>
  );
}

