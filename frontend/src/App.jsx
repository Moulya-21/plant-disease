import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import ModelStats from './components/ModelStats';
import ImageUploader from './components/ImageUploader';
import PredictionResult from './components/PredictionResult';
import HistoryDrawer from './components/HistoryDrawer';
import ToastContainer from './components/ToastContainer';
import ClassSpectrumExplorer from './components/ClassSpectrumExplorer';
import LandingPage from './components/LandingPage';
import ProfileModal from './components/ProfileModal';
import { Sprout, Sparkles, Activity, ShieldCheck } from 'lucide-react';
import './App.css';

function MainLayout() {
  const { predictionResult, isInferring, user } = useApp();

  return (
    <div className="app-layout">
      <Navbar />
      <ToastContainer />

      {!user ? <LandingPage /> : <main className="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-pill">
            <Sprout size={16} className="hero-pill-icon" />
            <span>Autonomous Agricultural AI Suite</span>
          </div>
          <h2 className="hero-headline">
            Neural Crop Pathology with <span className="headline-gradient">Explainable AI</span>
          </h2>
          <p className="hero-subtext">
            Classifying 38 distinct crop pathologies and healthy conditions using high-precision
            Convolutional Neural Networks, interactive Grad-CAM visual heatmaps, and agronomic treatment protocols.
          </p>
        </section>

        {/* Technical Stats Overview */}
        <ModelStats />

        {/* Diagnostic Studio Workspace */}
        <div className="diagnosis-workspace">
          <div className="workspace-column">
            <ImageUploader />
          </div>

          <div className="workspace-column">
            {predictionResult || isInferring ? (
              <PredictionResult />
            ) : (
              <div className="empty-analysis-card glass-panel">
                <div className="empty-icon-wrap">
                  <Sprout size={48} className="empty-leaf-icon" />
                </div>
                <h3>Awaiting Specimen Analysis</h3>
                <p>
                  Upload an image of a crop leaf or select one of our pre-calibrated benchmark specimens
                  to compute multi-class probability scores, Grad-CAM attribution heatmaps, and biological treatment protocols.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Comprehensive 38-Class Pathology Compendium */}
        <ClassSpectrumExplorer />
      </main>}

      {/* Footer */}
      <footer className="footer glass-panel">
        <div className="footer-content">
          <p>© 2026 PlantGuard AI • Deep Learning Plant Pathology Platform</p>
          <div className="footer-links">
            <span>Trained on 54,000+ PlantVillage Specimen Samples</span>
            <span>•</span>
            <span>FastAPI + SQLite + React + TensorFlow + Tailwind CSS</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <AuthModal />
      <HistoryDrawer />
      <ProfileModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
