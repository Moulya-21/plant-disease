import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import ModelStats from './components/ModelStats';
import ImageUploader from './components/ImageUploader';
import PredictionResult from './components/PredictionResult';
import HistoryDrawer from './components/HistoryDrawer';
import {
  getUser,
  logout,
  checkHealth,
  getModelInfo,
  predictDisease,
  generateGradcam,
  fetchHistory,
} from './api';
import { AlertCircle, CheckCircle, Sparkles, Sprout } from 'lucide-react';
import './App.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');
  const [modelInfo, setModelInfo] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [analyzingType, setAnalyzingType] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [gradcamImage, setGradcamImage] = useState(null);
  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  useEffect(() => {
    const savedUser = getUser();
    if (savedUser) setUser(savedUser);

    const initBackend = async () => {
      const health = await checkHealth();
      setServerStatus(health.status);
      const info = await getModelInfo();
      setModelInfo(info);
    };

    initBackend();
  }, []);

  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setHistoryList([]);
    }
  }, [user]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const records = await fetchHistory();
      setHistoryList(records);
    } catch {
      // Ignore background history errors
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    showNotification('success', `Welcome back, ${authenticatedUser.username}!`);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setHistoryDrawerOpen(false);
    showNotification('info', 'Successfully signed out.');
  };

  const handleAnalyze = async (imageFile) => {
    if (!user) {
      showNotification('error', 'Authentication required. Please sign in or use Demo credentials.');
      setAuthModalOpen(true);
      return;
    }

    setLoading(true);
    setAnalyzingType('inference');
    setGradcamImage(null);

    try {
      const result = await predictDisease(imageFile);
      setPredictionResult(result);
      showNotification('success', 'Neural diagnosis completed successfully!');
      loadHistory();
    } catch (err) {
      showNotification('error', err.message || 'Diagnostic inference failed');
    } finally {
      setLoading(false);
      setAnalyzingType(null);
    }
  };

  const handleGradCam = async (imageFile) => {
    if (!user) {
      showNotification('error', 'Authentication required. Please sign in or use Demo credentials.');
      setAuthModalOpen(true);
      return;
    }

    setLoading(true);
    setAnalyzingType('gradcam');

    try {
      const result = await generateGradcam(imageFile);
      setGradcamImage(result.gradcam_image);
      setPredictionResult(result);
      showNotification('success', 'Grad-CAM feature heatmap generated!');
    } catch (err) {
      showNotification('error', err.message || 'Grad-CAM calculation failed');
    } finally {
      setLoading(false);
      setAnalyzingType(null);
    }
  };

  return (
    <div className="app-layout">
      <Navbar
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenHistory={() => setHistoryDrawerOpen(true)}
        serverStatus={serverStatus}
        modelInfo={modelInfo}
      />

      {notification && (
        <div className={`notification-toast toast-${notification.type} animate-fade-in`}>
          {notification.type === 'error' && <AlertCircle size={18} />}
          {notification.type === 'success' && <CheckCircle size={18} />}
          {notification.type === 'info' && <Sparkles size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      <main className="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-pill">
            <Sprout size={16} className="hero-pill-icon" />
            <span>Autonomous Agricultural AI Suite</span>
          </div>
          <h2 className="hero-headline">
            Neural Crop Diagnosis with <span className="headline-gradient">Explainable AI</span>
          </h2>
          <p className="hero-subtext">
            Classifying 38 distinct crop pathologies and healthy conditions using high-precision
            Convolutional Neural Networks and Grad-CAM visual heatmaps.
          </p>
        </section>

        {/* Technical Stats */}
        <ModelStats />

        {/* Diagnosis Studio Grid */}
        <div className="diagnosis-workspace">
          <div className="workspace-column">
            <ImageUploader
              onAnalyze={handleAnalyze}
              onGradCam={handleGradCam}
              loading={loading}
              analyzingType={analyzingType}
            />
          </div>

          <div className="workspace-column">
            {predictionResult ? (
              <PredictionResult
                result={predictionResult}
                gradcamImage={gradcamImage}
              />
            ) : (
              <div className="empty-analysis-card glass-panel">
                <div className="empty-icon-wrap">
                  <Sprout size={48} className="empty-leaf-icon" />
                </div>
                <h3>Awaiting Specimen Analysis</h3>
                <p>
                  Upload an image of a crop leaf or click one of our benchmark specimens
                  to generate multi-class probability scores and biological treatment protocols.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="footer glass-panel">
        <div className="footer-content">
          <p>© 2026 PlantGuard AI • Deep Learning Plant Pathology Platform</p>
          <div className="footer-links">
            <span>Trained on 54,000+ PlantVillage Specimen Samples</span>
            <span>•</span>
            <span>FastAPI + SQLite + React + TensorFlow</span>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <HistoryDrawer
        isOpen={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        historyList={historyList}
        loading={historyLoading}
      />
    </div>
  );
}
