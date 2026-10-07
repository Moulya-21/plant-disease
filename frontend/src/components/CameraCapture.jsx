import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function CameraCapture({ isOpen, onClose }) {
  const { selectSpecimen, showToast } = useApp();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setError(null);

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera device access is not supported by this browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (isMounted) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } else {
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to access camera. Please allow camera permissions.');
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, facingMode]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    setCapturing(true);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `field_camera_capture_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        selectSpecimen(file);
        showToast('success', 'Photo Captured', 'Foliage specimen loaded into diagnostic engine.');
        onClose();
      }
      setCapturing(false);
    }, 'image/jpeg', 0.95);
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card glass-panel max-w-[560px]" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Camera size={22} className="text-emerald-500" />
            <h2>Field Foliage Camera</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div className="auth-error-banner animate-fade-in flex items-start gap-2.5">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Camera Access Blocked</p>
              <p className="text-xs opacity-90">{error}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="relative w-full h-[320px] bg-black rounded-xl overflow-hidden border border-[var(--border-subtle)] flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 pointer-events-none border-2 border-emerald-500/30 rounded-xl m-4 border-dashed" />
              <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-md text-xs text-white backdrop-blur-sm">
                Center leaf inside guidelines
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-1">
              <button
                type="button"
                className="btn btn-secondary text-xs flex items-center gap-1.5"
                onClick={toggleCamera}
                title="Switch front/back camera"
              >
                <RefreshCw size={14} />
                <span>Flip Lens</span>
              </button>

              <button
                type="button"
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                onClick={handleCapture}
                disabled={capturing || !!error}
              >
                <Camera size={18} />
                <span>{capturing ? 'Processing...' : 'Capture Specimen'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
