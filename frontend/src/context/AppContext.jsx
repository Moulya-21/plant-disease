import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getToken,
  setToken,
  getUser,
  setUser,
  login,
  register,
  logout,
  checkHealth,
  getModelInfo,
  predictDisease,
  generateGradcam,
  fetchHistory,
} from '../api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // 1. Theme State (Dark / Light)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('plantguard_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('plantguard_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // 2. Authentication State
  const [user, setUserState] = useState(() => getUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleLogin = useCallback(async (username, password) => {
    const data = await login(username, password);
    setUserState(data.user);
    showToast('success', 'Authenticated', `Welcome back, ${data.user.username}!`);
    return data;
  }, []);

  const handleRegister = useCallback(async (username, password) => {
    const data = await register(username, password);
    const loginData = await login(username, password);
    setUserState(loginData.user);
    showToast('success', 'Account Activated', `Agronomist profile created for ${username}.`);
    return loginData;
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    setUserState(null);
    setHistoryRecords([]);
    showToast('info', 'Signed Out', 'Session terminated securely.');
  }, []);

  // 3. Backend Health & Model Metrics (with AbortController cleanup)
  const [serverStatus, setServerStatus] = useState('checking');
  const [modelInfo, setModelInfo] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStatus = async () => {
      try {
        const health = await checkHealth();
        setServerStatus(health.status);
      } catch {
        setServerStatus('offline');
      }
      try {
        const info = await getModelInfo();
        setModelInfo(info);
      } catch {
        // fallback model info
      }
    };

    fetchStatus();
    // Poll heartbeat every 30 seconds
    const interval = setInterval(fetchStatus, 30000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  // 4. Ingestion, Inference & Grad-CAM State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isInferring, setIsInferring] = useState(false);
  const [inferringType, setInferringType] = useState(null); // 'predict' | 'gradcam'
  const [predictionResult, setPredictionResult] = useState(null);
  const [gradcamImage, setGradcamImage] = useState(null);

  const selectSpecimen = useCallback((file) => {
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const clearSpecimen = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setPredictionResult(null);
    setGradcamImage(null);
  }, [previewUrl]);

  // 5. Audit History & Optimistic Updates
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('plantguard_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('plantguard_bookmarks', JSON.stringify(bookmarkedIds));
  }, [bookmarkedIds]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const records = await fetchHistory();
      setHistoryRecords(records);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, loadHistory]);

  // Optimistic Bookmark Toggle
  const toggleBookmark = useCallback((recordId) => {
    setBookmarkedIds((prev) => {
      const exists = prev.includes(recordId);
      const updated = exists ? prev.filter((id) => id !== recordId) : [...prev, recordId];
      return updated;
    });
  }, []);

  // Optimistic Record Deletion with Rollback capability
  const optimisticDeleteRecord = useCallback(
    (recordId) => {
      const previousRecords = [...historyRecords];
      // Instantly update UI optimistically
      setHistoryRecords((prev) => prev.filter((r) => r.id !== recordId));
      showToast('info', 'Record Removed', 'Diagnosis removed from active session.', {
        label: 'Undo',
        onClick: () => {
          setHistoryRecords(previousRecords);
          showToast('success', 'Restored', 'Record restored.');
        },
      });
    },
    [historyRecords]
  );

  // 6. Action Triggers: Predict and Grad-CAM
  const runPrediction = useCallback(
    async (fileToDiagnose = selectedFile) => {
      if (!user) {
        showToast('error', 'Auth Required', 'Please authenticate to run deep inference.');
        setAuthModalOpen(true);
        return;
      }
      const targetFile = fileToDiagnose || selectedFile;
      if (!targetFile) return;

      setIsInferring(true);
      setInferringType('predict');
      setGradcamImage(null);

      try {
        const result = await predictDisease(targetFile);
        setPredictionResult(result);
        showToast(
          'success',
          'Diagnosis Complete',
          `Classified as ${result.prediction.class_name} (${(result.prediction.confidence * 100).toFixed(1)}%).`
        );
        loadHistory();
      } catch (err) {
        showToast('error', 'Inference Failed', err.message || 'Error executing neural network.');
      } finally {
        setIsInferring(false);
        setInferringType(null);
      }
    },
    [user, selectedFile, loadHistory]
  );

  const runGradCam = useCallback(
    async (fileToDiagnose = selectedFile) => {
      if (!user) {
        showToast('error', 'Auth Required', 'Please authenticate to generate Grad-CAM.');
        setAuthModalOpen(true);
        return;
      }
      const targetFile = fileToDiagnose || selectedFile;
      if (!targetFile) return;

      setIsInferring(true);
      setInferringType('gradcam');

      try {
        const result = await generateGradcam(targetFile);
        setGradcamImage(result.gradcam_image);
        setPredictionResult(result);
        showToast('success', 'Grad-CAM Ready', 'Neural activation heatmap generated.');
      } catch (err) {
        showToast('error', 'Grad-CAM Failed', err.message || 'Error extracting gradients.');
      } finally {
        setIsInferring(false);
        setInferringType(null);
      }
    },
    [user, selectedFile]
  );

  // 7. Toast Notification System
  const [toasts, setToasts] = useState([]);
  const toastTimeoutRef = useRef({});

  const showToast = useCallback((type, title, message, action = null) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newToast = { id, type, title, message, action };

    setToasts((prev) => [...prev.slice(-3), newToast]); // keep max 4 toasts

    toastTimeoutRef.current[id] = setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    if (toastTimeoutRef.current[id]) {
      clearTimeout(toastTimeoutRef.current[id]);
      delete toastTimeoutRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = {
    // Theme
    theme,
    toggleTheme,
    // Auth
    user,
    authModalOpen,
    setAuthModalOpen,
    handleLogin,
    handleRegister,
    handleLogout,
    // Server & Model
    serverStatus,
    modelInfo,
    // Specimen & Inference
    selectedFile,
    previewUrl,
    selectSpecimen,
    clearSpecimen,
    isInferring,
    inferringType,
    predictionResult,
    gradcamImage,
    runPrediction,
    runGradCam,
    // History & Optimistic Actions
    historyRecords,
    historyLoading,
    historyDrawerOpen,
    setHistoryDrawerOpen,
    loadHistory,
    bookmarkedIds,
    toggleBookmark,
    optimisticDeleteRecord,
    // Toasts
    toasts,
    removeToast,
    showToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
