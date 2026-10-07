import React, { useState } from 'react';
import { Search, BookOpen, ChevronRight, CheckCircle2, ShieldAlert, Sparkles, X } from 'lucide-react';
import { getAdvisoryForClass } from '../diseaseInfo';

const ALL_CLASSES = [
  "Apple___Apple_scab",
  "Apple___Black_rot",
  "Apple___Cedar_apple_rust",
  "Apple___healthy",
  "Blueberry___healthy",
  "Cherry_(including_sour)___Powdery_mildew",
  "Cherry_(including_sour)___healthy",
  "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
  "Corn_(maize)___Common_rust_",
  "Corn_(maize)___Northern_Leaf_Blight",
  "Corn_(maize)___healthy",
  "Grape___Black_rot",
  "Grape___Esca_(Black_Measles)",
  "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
  "Grape___healthy",
  "Orange___Haunglongbing_(Citrus_greening)",
  "Peach___Bacterial_spot",
  "Peach___healthy",
  "Pepper,_bell___Bacterial_spot",
  "Pepper,_bell___healthy",
  "Potato___Early_blight",
  "Potato___Late_blight",
  "Potato___healthy",
  "Raspberry___healthy",
  "Soybean___healthy",
  "Squash___Powdery_mildew",
  "Strawberry___Leaf_scorch",
  "Strawberry___healthy",
  "Tomato___Bacterial_spot",
  "Tomato___Early_blight",
  "Tomato___Late_blight",
  "Tomato___Leaf_Mold",
  "Tomato___Septoria_leaf_spot",
  "Tomato___Spider_mites Two-spotted_spider_mite",
  "Tomato___Target_Spot",
  "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
  "Tomato___Tomato_mosaic_virus",
  "Tomato___healthy"
];

function formatClassName(raw) {
  return raw.replace("___", " - ").replace(/_/g, " ");
}

export default function ClassSpectrumExplorer() {
  const [search, setSearch] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('All');
  const [selectedDisease, setSelectedDisease] = useState(null);

  const crops = ['All', 'Tomato', 'Apple', 'Corn', 'Potato', 'Grape', 'Strawberry', 'Pepper'];

  const filtered = ALL_CLASSES.filter((c) => {
    const formatted = formatClassName(c).toLowerCase();
    const matchesSearch = formatted.includes(search.toLowerCase());
    const matchesCrop = selectedCrop === 'All' || formatted.startsWith(selectedCrop.toLowerCase());
    return matchesSearch && matchesCrop;
  });

  return (
    <section className="class-explorer-section glass-panel">
      <div className="section-header-row">
        <div className="flex items-center gap-2.5">
          <BookOpen size={20} className="text-emerald-500" />
          <div>
            <h3>38-Class Pathology Compendium</h3>
            <p className="section-desc">
              Browse reference diagnostic guidelines, visual symptoms, and treatment protocols for all supported crops.
            </p>
          </div>
        </div>

        <div className="input-with-icon max-w-[280px]">
          <Search size={15} className="input-icon" />
          <input
            type="text"
            className="input-field !py-2 !text-xs"
            placeholder="Filter by pathology name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Crop Filter Chips */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {crops.map((crop) => (
          <button
            key={crop}
            className={`crop-chip ${selectedCrop === crop ? 'active' : ''}`}
            onClick={() => setSelectedCrop(crop)}
          >
            {crop}
          </button>
        ))}
      </div>

      {/* Classes Grid */}
      <div className="explorer-grid mt-4">
        {filtered.map((item) => {
          const formatted = formatClassName(item);
          const isHealthy = formatted.toLowerCase().includes('healthy');
          const advisory = getAdvisoryForClass(formatted);

          return (
            <div
              key={item}
              className="explorer-card glass-panel"
              onClick={() => setSelectedDisease({ name: formatted, advisory })}
            >
              <div className="flex items-center gap-2">
                {isHealthy ? (
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                ) : (
                  <ShieldAlert size={15} className="text-amber-500 shrink-0" />
                )}
                <span className="explorer-card-title">{formatted}</span>
              </div>
              <ChevronRight size={14} className="text-[var(--text-dim)] shrink-0" />
            </div>
          );
        })}
      </div>

      {/* Detail Dialog */}
      {selectedDisease && (
        <div className="modal-backdrop" onClick={() => setSelectedDisease(null)}>
          <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Sparkles size={20} className="text-emerald-500" />
                <h3 className="text-lg font-bold">{selectedDisease.name}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedDisease(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-sm mt-2">
              <p className="text-[var(--text-muted)]">{selectedDisease.advisory.description}</p>

              <div className="treatment-item treatment-action">
                <div className="treatment-label">Agronomic Immediate Action</div>
                <p className="treatment-text">{selectedDisease.advisory.action}</p>
              </div>

              <div className="treatment-item treatment-organic">
                <div className="treatment-label">Biological / Organic Protocol</div>
                <p className="treatment-text">{selectedDisease.advisory.organic}</p>
              </div>

              <div className="treatment-item treatment-chemical">
                <div className="treatment-label">Chemical Control</div>
                <p className="treatment-text">{selectedDisease.advisory.chemical}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
