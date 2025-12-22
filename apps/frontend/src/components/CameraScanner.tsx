import { useState, useRef, useEffect } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import toast from "react-hot-toast";

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function CameraScanner({ onScan, onClose, isOpen }: CameraScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      return;
    }

    startScanning();
    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      setError(null);
      setScanning(true);

      // Initialize ZXing reader
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      // Get available video input devices
      const videoInputDevices = await codeReader.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        throw new Error("No camera devices found");
      }

      // Use the first available camera (usually the default)
      // For mobile devices, prefer back camera if available
      const backCamera = videoInputDevices.find(
        (device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear"),
      );
      const selectedDeviceId =
        backCamera?.deviceId || videoInputDevices[0].deviceId;

      // Start decoding from video stream
      codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const barcode = result.getText();
            if (barcode) {
              onScan(barcode);
              // Don't stop scanning - allow multiple scans
            }
          }

          if (error && !(error instanceof NotFoundException)) {
            // NotFoundException is normal - it means no barcode found yet
            console.warn("Scan error:", error);
          }
        },
      );

      // Get stream from video element
      if (videoRef.current && videoRef.current.srcObject) {
        streamRef.current = videoRef.current.srcObject as MediaStream;
      }
    } catch (err: any) {
      console.error("Failed to start camera scanner:", err);
      setError(err.message || "Failed to access camera");
      setScanning(false);

      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        toast.error("Camera permission denied. Please allow camera access.");
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        toast.error("No camera found. Please connect a camera device.");
      } else {
        toast.error("Failed to start camera scanner: " + err.message);
      }
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setScanning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="theme-card w-full max-w-2xl rounded-2xl sm:rounded-3xl border p-4 sm:p-6 shadow-2xl">
        <div className="mb-3 sm:mb-4 flex items-center justify-between">
          <h2 className="theme-text-primary text-lg sm:text-xl font-bold">
            Camera Scanner
          </h2>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="theme-chip rounded-full border p-2 transition hover:bg-white/10 active:scale-95 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close scanner"
          >
            ✕
          </button>
        </div>

        <div className="relative mb-3 sm:mb-4 aspect-video w-full overflow-hidden rounded-xl sm:rounded-2xl bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            autoPlay
            muted
          />
          {!scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center">
                <p className="theme-text-primary mb-2 text-lg font-semibold">
                  ⚠️ {error}
                </p>
                <button
                  onClick={startScanning}
                  className="rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-2 font-semibold text-white transition hover:shadow-lg"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          {/* Scanning overlay with guide lines */}
          {scanning && !error && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 top-1/2 h-40 w-40 sm:h-48 sm:w-48 -translate-x-1/2 -translate-y-1/2 border-2 border-sky-400 border-dashed rounded-lg" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="theme-text-primary text-xs sm:text-sm font-semibold bg-black/60 px-2 sm:px-3 py-1 rounded">
                  Position barcode/QR code here
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 text-center">
          <p className="theme-text-secondary text-xs sm:text-sm">
            {scanning && !error
              ? "Point your camera at a barcode or QR code"
              : error
                ? "Camera scanner unavailable"
                : "Starting camera..."}
          </p>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="theme-chip w-full rounded-full border px-6 py-3 font-semibold transition hover:bg-white/10 active:scale-95 touch-manipulation min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
