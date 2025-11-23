import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { useScannerDeviceStore } from '../stores/scannerDeviceStore';
import {
  registerCameraDevice,
  sendDeviceHeartbeat,
} from '../services/scannerDeviceService';
import { ensureCameraPermission } from '../services/scannerService';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  isVisible?: boolean;
}

type ScanMode = 'camera' | 'camera-snap';

export function CameraScanner({ onScan, isVisible = true }: CameraScannerProps) {
  const [scanMode, setScanMode] = useState<ScanMode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  
  const { addDevice, markDeviceUsed, setActiveDevice } = useScannerDeviceStore();
  const { user } = useAuthStore();

  // Camera-based QR scanning (live streaming mode)
  const startCameraScan = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      setCameraError(null);
      setScanMode('camera');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser.');
      }

      await ensureCameraPermission();

      // Register camera device
      const deviceData = await registerCameraDevice(user?.locationId, user?.id);
      const deviceId = addDevice({
        ...deviceData,
        isActive: true,
      });
      setActiveDevice(deviceId);
      await sendDeviceHeartbeat(deviceId, user?.id);

      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      // Get available video devices
      const videoInputDevices = await codeReader.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        throw new Error('No camera devices found');
      }

      // Prefer rear camera if available (usually better for scanning)
      const rearCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      const selectedDeviceId = rearCamera?.deviceId || videoInputDevices[0].deviceId;

      // Start scanning
      await codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText();
            if (text) {
              // Mark camera device as used
              const activeDevice = useScannerDeviceStore.getState().getActiveDevice();
              if (activeDevice) {
                markDeviceUsed(activeDevice.id);
                sendDeviceHeartbeat(activeDevice.id, user?.id).catch((err) =>
                  console.warn('Failed to send heartbeat', err),
                );
              }
              
              toast.success(`Scanned: ${text}`);
              onScan(text);
              stopCameraScan();
            }
          }
          if (error && error.name !== 'NotFoundException') {
            console.warn('Camera scan error:', error);
          }
        },
      );
    } catch (error: any) {
      console.error('Failed to start camera:', error);
      setCameraError(error.message || 'Failed to access camera');
      setScanMode(null);
      toast.error(error.message || 'Failed to access camera');
    }
  }, [onScan, user?.locationId, user?.id, addDevice, setActiveDevice, markDeviceUsed]);

  // Camera snap & decode mode (better for low light)
  const startCameraSnapMode = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setCameraError(null);
      setScanMode('camera-snap');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser.');
      }

      await ensureCameraPermission();

      // Register camera device
      const deviceData = await registerCameraDevice(user?.locationId, user?.id);
      const deviceId = addDevice({
        ...deviceData,
        name: `${deviceData.name || 'Camera Scanner'} (Snap Mode)`,
        isActive: true,
      });
      setActiveDevice(deviceId);
      await sendDeviceHeartbeat(deviceId, user?.id);

      // Get available video devices
      const codeReader = new BrowserMultiFormatReader();
      const videoInputDevices = await codeReader.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        throw new Error('No camera devices found');
      }

      // Prefer rear camera if available
      const rearCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      const selectedDeviceId = rearCamera?.deviceId || videoInputDevices[0].deviceId;

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: selectedDeviceId },
          facingMode: 'environment',
        },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.play();

      // Set canvas dimensions to match video
      videoRef.current.addEventListener('loadedmetadata', () => {
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
      });
    } catch (error: any) {
      console.error('Failed to start camera snap mode:', error);
      setCameraError(error.message || 'Failed to access camera');
      setScanMode(null);
      toast.error(error.message || 'Failed to access camera');
    }
  }, [user?.locationId, user?.id, addDevice, setActiveDevice]);

  // Capture and decode a single frame
  const captureAndDecode = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) {
      toast.error('Camera not ready');
      return;
    }

    setIsCapturing(true);
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageDataUrl = canvas.toDataURL('image/png');
      const img = new Image();
      img.src = imageDataUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const codeReader = new BrowserMultiFormatReader();
      const result = await codeReader.decodeFromImageElement(img);

      if (result) {
        const text = result.getText();
        if (text) {
          const activeDevice = useScannerDeviceStore.getState().getActiveDevice();
          if (activeDevice) {
            markDeviceUsed(activeDevice.id);
            sendDeviceHeartbeat(activeDevice.id, user?.id).catch((err) =>
              console.warn('Failed to send heartbeat', err),
            );
          }
          
          toast.success(`Scanned: ${text}`);
          onScan(text);
          stopCameraScan();
        }
      }
    } catch (error: any) {
      if (error.name !== 'NotFoundException') {
        console.error('Decode error:', error);
        toast.error('No barcode/QR code found in image. Try again.');
      } else {
        toast.error('No barcode/QR code found. Try again.');
      }
    } finally {
      setIsCapturing(false);
    }
  }, [onScan, markDeviceUsed, user?.id]);

  const stopCameraScan = useCallback(() => {
    if (codeReaderRef.current && videoRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    const activeDevice = useScannerDeviceStore.getState().getActiveDevice();
    if (activeDevice && activeDevice.type === 'camera') {
      useScannerDeviceStore.getState().updateDevice(activeDevice.id, { isActive: false });
      sendDeviceHeartbeat(activeDevice.id, user?.id, { isActive: false }).catch((err) =>
        console.warn('Failed to send heartbeat', err),
      );
      setActiveDevice(null);
    }
    
    setScanMode(null);
    setCameraError(null);
    setIsCapturing(false);
  }, [setActiveDevice, user?.id]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCameraScan();
    };
  }, [stopCameraScan]);

  // Stop camera when component is hidden
  useEffect(() => {
    if (!isVisible && scanMode) {
      stopCameraScan();
    }
  }, [isVisible, scanMode, stopCameraScan]);

  if (!isVisible) return null;

  return (
    <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="theme-text-primary text-xl font-semibold">Camera Scanner</h2>
          <p className="theme-text-secondary text-sm">
            Use your camera to scan barcodes and QR codes
          </p>
        </div>
        <div className="flex gap-2">
          {scanMode ? (
            <>
              {scanMode === 'camera-snap' && (
                <button
                  onClick={captureAndDecode}
                  disabled={isCapturing}
                  className="theme-chip rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50"
                >
                  {isCapturing ? '⏳ Decoding...' : '📸 Capture'}
                </button>
              )}
              <button
                onClick={stopCameraScan}
                className="theme-chip rounded-full border border-rose-400/40 bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/25"
              >
                Stop Camera
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startCameraScan}
                className="theme-chip rounded-full border border-sky-400/40 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/25"
                title="Live camera scanning (continuous)"
              >
                📷 Live Scan
              </button>
              <button
                onClick={startCameraSnapMode}
                className="theme-chip rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/25"
                title="Snap & decode mode (better for low light)"
              >
                📸 Snap Mode
              </button>
            </>
          )}
        </div>
      </div>

      {scanMode && (
        <div className="space-y-2">
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded-2xl border-2 border-white/20 bg-black"
              style={{ maxHeight: '400px', objectFit: 'contain' }}
              playsInline
              autoPlay
              muted
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            {scanMode === 'camera-snap' && (
              <div className="absolute top-2 right-2 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium">
                Snap Mode Active
              </div>
            )}
          </div>
          {cameraError && (
            <p className="text-sm text-rose-400 bg-rose-500/15 border border-rose-400/40 p-3 rounded-xl">
              {cameraError}
            </p>
          )}
          <p className="text-xs theme-text-secondary text-center">
            {scanMode === 'camera' 
              ? 'Point your camera at a QR code or barcode (auto-detects)'
              : 'Point camera at QR code, then click "Capture" to scan'}
          </p>
        </div>
      )}

      {!scanMode && (
        <div className="theme-surface rounded-2xl border border-dashed p-12 text-center">
          <div className="text-5xl mb-4">📷</div>
          <p className="theme-text-primary text-lg font-semibold mb-2">Camera Scanner Ready</p>
          <p className="theme-text-secondary text-sm">
            Click "Live Scan" or "Snap Mode" to start scanning
          </p>
        </div>
      )}
    </div>
  );
}

