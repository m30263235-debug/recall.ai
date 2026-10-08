import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  RefreshCw,
  X,
  Check,
  RotateCcw,
  Sparkles,
  AlertCircle,
  UploadCloud,
  SwitchCamera,
} from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  onFallbackToFilePicker?: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onFallbackToFilePicker,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileFallbackRef = useRef<HTMLInputElement | null>(null);

  // Check if multiple camera devices exist
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setHasMultipleCameras(videoInputs.length > 1);
    }).catch(() => {
      // Ignore enumeration failure
    });
  }, []);

  // Stop media stream tracks
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start media stream
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    if (!isOpen) return;
    setIsLoadingCamera(true);
    setPermissionError(null);

    // Stop existing stream first
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Your browser or current frame does not support direct live camera streaming.');
      }

      // Constraints: try preferred facing mode, fallback to any video
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (err) {
        // Fallback with basic video constraint
        console.warn('Fallback to basic video constraints:', err);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((e) => console.warn('Video play error:', e));
      }
    } catch (err: any) {
      console.error('Camera stream access error:', err);
      let errorMsg = 'Could not access camera. Please verify camera permissions are enabled in your browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera access was denied. Please allow camera permissions in your browser address bar and reload.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera device found on this system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Camera is currently in use by another application.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setPermissionError(errorMsg);
    } finally {
      setIsLoadingCamera(false);
    }
  }, [isOpen, stream]);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setPermissionError(null);
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedImage(null);
    }
    return () => {
      stopStream();
    };
  }, [isOpen]);

  // Make sure video element receives stream when mounted/updated
  useEffect(() => {
    if (videoRef.current && stream && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Flip camera between front and back
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capture photo snapshot from video element
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Trigger flash animation
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, mirror image for natural feeling
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);

    // Pause stream while reviewing
    stopStream();
  };

  // Confirm photo and create File object
  const handleConfirmPhoto = () => {
    if (!capturedImage) return;

    setIsCapturing(true);
    // Convert base64 Data URL to Blob -> File
    try {
      const arr = capturedImage.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File([blob], `camera-snap-${timestamp}.jpg`, { type: 'image/jpeg' });

      onCapture(file);
      onClose();
    } catch (e) {
      console.error('Failed to convert captured photo to file:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  // Fallback to native system camera file input
  const triggerNativeCamera = () => {
    stopStream();
    if (onFallbackToFilePicker) {
      onFallbackToFilePicker();
      onClose();
    } else if (fileFallbackRef.current) {
      fileFallbackRef.current.click();
    }
  };

  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onCapture(e.target.files[0]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live Camera Viewfinder"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Hidden file input for native camera fallback */}
      <input
        type="file"
        ref={fileFallbackRef}
        accept="image/*"
        capture="environment"
        onChange={handleNativeFileChange}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      <div
        className="relative w-full max-w-xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Shutter Flash Overlay */}
        {flashEffect && (
          <div className="absolute inset-0 bg-white z-40 pointer-events-none animate-out fade-out duration-200" />
        )}

        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-stone-950/80 border-b border-stone-800/80 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Camera Capture
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live View
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">
                Snap IEMs, tech gear, slides, or documents for AI analysis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
            title="Close camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview Body */}
        <div className="relative aspect-4/3 sm:aspect-16/10 bg-black flex items-center justify-center overflow-hidden">
          {/* Permission Error State */}
          {permissionError ? (
            <div className="p-6 text-center max-w-md mx-auto flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
                <CameraOff className="w-6 h-6" />
              </div>
              <h4 className="text-white text-base font-bold mb-1">Camera Permission Required</h4>
              <p className="text-stone-300 text-xs leading-relaxed mb-4">
                {permissionError}
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-stone-700 transition cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Access
                </button>
                <button
                  type="button"
                  onClick={triggerNativeCamera}
                  className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  Use Native Camera
                </button>
              </div>
            </div>
          ) : capturedImage ? (
            /* Snapshot Preview */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedImage}
                alt="Captured Snapshot"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs px-2.5 py-1 rounded-full text-[11px] font-semibold text-white border border-stone-700">
                Photo Captured
              </div>
            </div>
          ) : (
            /* Live Video Stream Viewfinder */
            <>
              {isLoadingCamera && (
                <div className="absolute inset-0 z-10 bg-black/70 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                  <span className="text-xs text-stone-300">Accessing camera feed...</span>
                </div>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-transform ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Viewfinder Target Framing Overlay */}
              <div className="absolute inset-8 sm:inset-12 pointer-events-none border border-white/20 rounded-2xl flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm" />
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-sm" />
                </div>
              </div>

              {/* Camera Switch Button (if front/back or multiple cameras available) */}
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="absolute top-3 right-3 z-20 p-2.5 rounded-full bg-stone-900/80 backdrop-blur-md text-white hover:bg-stone-800 border border-stone-700 transition cursor-pointer active:scale-95"
                title={`Switch to ${facingMode === 'environment' ? 'front' : 'rear'} camera`}
              >
                <SwitchCamera className="w-4 h-4 text-emerald-400" />
              </button>

              <div className="absolute bottom-3 left-3 z-20 px-2 py-1 rounded-md bg-stone-950/70 backdrop-blur-xs text-[10px] text-stone-300 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
              </div>
            </>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="p-4 bg-stone-950 border-t border-stone-800/80 flex items-center justify-between gap-3">
          {capturedImage ? (
            /* Review Controls */
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 border border-stone-700 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Retake
              </button>

              <button
                type="button"
                onClick={handleConfirmPhoto}
                disabled={isCapturing}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Use Photo & Analyze
              </button>
            </div>
          ) : (
            /* Shutter & Alternate Capture Options */
            <div className="w-full flex items-center justify-between gap-3">
              {/* Native picker alternative */}
              <button
                type="button"
                onClick={triggerNativeCamera}
                className="px-3 py-2 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-900 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                title="Open system file or photo picker"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Choose File / Native Camera</span>
                <span className="sm:hidden">Upload</span>
              </button>

              {/* Shutter Button */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  disabled={isLoadingCamera || !!permissionError}
                  className="w-14 h-14 rounded-full border-4 border-white/80 p-1 flex items-center justify-center bg-transparent hover:border-emerald-400 active:scale-95 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group shadow-lg"
                  title="Snap photo"
                >
                  <div className="w-full h-full rounded-full bg-white group-hover:bg-emerald-400 transition" />
                </button>
              </div>

              {/* Facing mode toggle button on mobile */}
              <button
                type="button"
                onClick={handleToggleFacingMode}
                disabled={isLoadingCamera || !!permissionError}
                className="px-3 py-2 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-900 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                title="Switch Camera"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flip Camera</span>
                <span className="sm:hidden">Flip</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
