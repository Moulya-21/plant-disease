import React, { useState, useRef } from 'react';
import { Flame, Sliders, Columns, Eye, Download, Info } from 'lucide-react';

export default function GradCamViewer({ originalUrl, gradcamImage, className }) {
  const [viewMode, setViewMode] = useState('slider'); // 'slider' | 'side-by-side' | 'heatmap'
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);

  const handleMouseDown = () => {
    isDraggingRef.current = true;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  };

  const handleTouchMove = (e) => {
    if (!containerRef.current || !e.touches[0]) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  };

  const downloadHeatmap = () => {
    if (!gradcamImage) return;
    const link = document.createElement('a');
    link.href = gradcamImage;
    link.download = `gradcam_attribution_${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="gradcam-card glass-panel animate-fade-in">
      <div className="gradcam-header">
        <div className="gradcam-title-wrap">
          <div className="gradcam-icon-badge">
            <Flame size={20} className="text-amber-500" />
          </div>
          <div>
            <h3>Explainable AI: Grad-CAM Attribution</h3>
            <p className="text-xs text-[var(--text-dim)]">Layer: conv2d_2 • Salient Visual Focus</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="view-mode-pill">
            <button
              className={`mode-btn ${viewMode === 'slider' ? 'active' : ''}`}
              onClick={() => setViewMode('slider')}
              title="Split comparison slider"
            >
              <Sliders size={15} />
              <span>Slider</span>
            </button>
            <button
              className={`mode-btn ${viewMode === 'side-by-side' ? 'active' : ''}`}
              onClick={() => setViewMode('side-by-side')}
              title="Side by side"
            >
              <Columns size={15} />
              <span>Split</span>
            </button>
            <button
              className={`mode-btn ${viewMode === 'heatmap' ? 'active' : ''}`}
              onClick={() => setViewMode('heatmap')}
              title="Overlay only"
            >
              <Eye size={15} />
              <span>Heatmap</span>
            </button>
          </div>

          <button
            className="btn btn-secondary !p-2 !rounded-lg"
            onClick={downloadHeatmap}
            title="Download Grad-CAM Overlay"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      <p className="gradcam-desc">
        Grad-CAM visualizes gradients flowing into the final convolutional layer.
        Warm regions (red, amber) indicate the exact morphological lesions driving the model’s classification.
      </p>

      {/* Visual Display based on View Mode */}
      {viewMode === 'slider' && (
        <div
          ref={containerRef}
          className="slider-comparison-box select-none"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
        >
          {/* Heatmap Base */}
          <img
            src={gradcamImage}
            alt="Grad-CAM Heatmap"
            className="slider-img slider-base-img"
            draggable={false}
          />

          {/* Raw Specimen Overlay Clipped */}
          <div
            className="slider-clipped-wrap"
            style={{ width: `${sliderPosition}%` }}
          >
            <img
              src={originalUrl}
              alt="Original Specimen"
              className="slider-img slider-overlay-img"
              draggable={false}
            />
          </div>

          {/* Divider Handle */}
          <div
            className="slider-divider-line"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="slider-handle-knob">
              <Sliders size={14} />
            </div>
          </div>

          <div className="slider-label-left">Original Leaf</div>
          <div className="slider-label-right">Grad-CAM Heatmap</div>
        </div>
      )}

      {viewMode === 'side-by-side' && (
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Original Specimen
            </span>
            <div className="side-img-box">
              <img src={originalUrl} alt="Original Specimen" className="w-full h-full object-contain" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Grad-CAM Attention Map
            </span>
            <div className="side-img-box">
              <img src={gradcamImage} alt="Heatmap" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}

      {viewMode === 'heatmap' && (
        <div className="heatmap-solo-box">
          <img src={gradcamImage} alt="Grad-CAM" className="max-h-[340px] w-auto mx-auto object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}
