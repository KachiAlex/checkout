import { useState, useEffect, useRef, useCallback } from "react";
import { useScannerDeviceStore } from "../stores/scannerDeviceStore";
import {
  registerUSBDevice,
  registerBluetoothDevice,
  sendDeviceHeartbeat,
} from "../services/scannerDeviceService";
import { useAuthStore } from "../stores/authStore";
import toast from "react-hot-toast";
import { CameraScanner } from "./CameraScanner";

interface ScannerInputProps {
  onScan: (barcode: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function ScannerInput({
  onScan,
  placeholder = "Scan barcode/QR with scanner, or type and press Enter...",
  autoFocus = true,
  className = "",
}: ScannerInputProps) {
  const [input, setInput] = useState("");
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const usbDeviceRegisteredRef = useRef(false);
  const bluetoothDeviceRef = useRef<any | null>(null);

  const { addDevice, markDeviceUsed, setActiveDevice, getActiveDevice } =
    useScannerDeviceStore();
  const { user } = useAuthStore();
  const activeDevice = getActiveDevice();

  // Handle rapid keyboard input from USB/Bluetooth scanners
  useEffect(() => {
    const inputEl = inputRef.current;
    if (!inputEl) return;

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const value = target.value;

      // Clear any existing timeout
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      // Detect rapid input (likely from scanner)
      const now = Date.now();
      lastScanTimeRef.current = now;

      // If input is coming very fast (< 100ms between chars), it's likely a scanner
      // Wait a bit longer for the scan to complete, then process
      scanTimeoutRef.current = setTimeout(() => {
        if (value.trim() && value.length >= 4) {
          // Minimum barcode length is typically 4+ characters

          // Register USB device on first scan if not already registered
          if (!usbDeviceRegisteredRef.current) {
            registerUSBScanner();
          }

          // Mark device as used
          const activeDevice = useScannerDeviceStore
            .getState()
            .getActiveDevice();
          if (activeDevice) {
            markDeviceUsed(activeDevice.id);
            sendDeviceHeartbeat(activeDevice.id, user?.id).catch((err) =>
              console.warn("Failed to send heartbeat", err),
            );
          }

          onScan(value.trim());
          setInput("");
          // Only refocus if this input was the one that had focus
          if (document.activeElement === inputEl) {
            inputEl.focus();
          }
        }
      }, 150); // Wait 150ms after last character for scanner completion
    };

    inputEl.addEventListener("input", handleInput);
    return () => {
      inputEl.removeEventListener("input", handleInput);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [onScan, markDeviceUsed, user?.id, registerUSBScanner]);

  // Register USB scanner on first scan
  // Most USB scanners work as HID keyboards and don't need explicit registration
  // They automatically type into input fields when scanning
  const registerUSBScanner = useCallback(async () => {
    if (usbDeviceRegisteredRef.current) return;

    try {
      // Try to register without requesting Web USB access first
      // Most scanners work as keyboards and don't need Web USB API
      const registeredDevice = await registerUSBDevice(
        user?.locationId,
        user?.id,
        undefined,
      );
      const deviceId = addDevice(registeredDevice);
      setActiveDevice(deviceId);
      usbDeviceRegisteredRef.current = true;
      console.log("USB scanner registered:", registeredDevice.name);
      await sendDeviceHeartbeat(deviceId, user?.id);
    } catch (error) {
      // Registration failure is okay - scanner will still work as keyboard
      console.log("USB scanner registration note:", error);
    }
  }, [user?.locationId, user?.id, addDevice, setActiveDevice]);

  // Auto-focus for keyboard scanners (only if explicitly enabled)
  useEffect(() => {
    if (!autoFocus) return;

    const inputEl = inputRef.current;
    if (!inputEl) return;

    // Only auto-focus on mount if no other input is focused
    const activeElement = document.activeElement;
    const isInputFocused =
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.getAttribute("contenteditable") === "true");

    if (!isInputFocused) {
      // Small delay to avoid interfering with page load
      const timer = setTimeout(() => {
        inputEl.focus();
      }, 100);
      return () => clearTimeout(timer);
    }

    // Don't add blur handler - let users click other inputs freely
  }, [autoFocus]);

  // Bluetooth scanner support
  const connectBluetoothScanner = useCallback(async () => {
    try {
      if (!(navigator as any).bluetooth) {
        throw new Error(
          "Web Bluetooth API not supported. Use Chrome/Edge on desktop or Android.",
        );
      }

      const isSecure =
        window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (!isSecure) {
        throw new Error("Bluetooth requires HTTPS or localhost.");
      }

      toast.loading("Searching for Bluetooth scanners...", {
        id: "bluetooth-connect",
      });

      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: ["00001812-0000-1000-8000-00805f9b34fb"] },
          { namePrefix: "Scanner" },
          { namePrefix: "Barcode" },
          { namePrefix: "QR" },
        ],
        optionalServices: [
          "battery_service",
          "device_information",
          "00001812-0000-1000-8000-00805f9b34fb",
        ],
      });

      toast.dismiss("bluetooth-connect");
      toast.loading("Connecting to device...", { id: "bluetooth-connect" });

      if (device.gatt) {
        try {
          const server = await device.gatt.connect();
          console.log("GATT server connected:", server);
        } catch (gattError) {
          console.warn(
            "GATT connection failed (device may be HID-only):",
            gattError,
          );
        }
      }

      const deviceData = await registerBluetoothDevice(
        device,
        user?.locationId,
        user?.id,
      );
      const deviceId = addDevice({
        ...deviceData,
        isActive: true,
      });
      setActiveDevice(deviceId);
      bluetoothDeviceRef.current = device;
      await sendDeviceHeartbeat(deviceId, user?.id);

      device.addEventListener("gattserverdisconnected", () => {
        console.log("Bluetooth scanner disconnected");
        toast.error(`Bluetooth scanner "${device.name}" disconnected`);
        if (deviceId) {
          useScannerDeviceStore
            .getState()
            .updateDevice(deviceId, { isActive: false });
          sendDeviceHeartbeat(deviceId, user?.id, { isActive: false }).catch(
            (err) => console.warn("Failed to send heartbeat", err),
          );
        }
        bluetoothDeviceRef.current = null;
      });

      toast.dismiss("bluetooth-connect");
      toast.success(`Bluetooth scanner "${device.name}" connected!`);
    } catch (error: any) {
      toast.dismiss("bluetooth-connect");

      if (error.name === "NotFoundError") {
        toast.error("No Bluetooth scanner found nearby.");
      } else if (error.name === "SecurityError") {
        toast.error("Bluetooth access denied.");
      } else if (error.name !== "AbortError") {
        toast.error(error.message || "Failed to connect Bluetooth scanner");
      }
    }
  }, [user?.locationId, user?.id, addDevice, setActiveDevice]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If Enter is pressed and input has value, treat as barcode scan
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      onScan(input.trim());
      setInput("");
      // Only refocus if autoFocus is enabled and this input was the one that had focus
      if (autoFocus && document.activeElement === inputRef.current) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }
    }
  };

  const isBluetoothSupported =
    typeof navigator !== "undefined" && "bluetooth" in (navigator as any);
  const isCameraSupported =
    typeof navigator !== "undefined" &&
    "mediaDevices" in navigator &&
    "getUserMedia" in navigator.mediaDevices;

  const handleCameraScan = (barcode: string) => {
    onScan(barcode);
    // Keep camera open for multiple scans
  };

  return (
    <>
      <div className={`space-y-3 ${className}`}>
        <div className="theme-surface flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-3 sm:p-4 shadow-inner shadow-black/40">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <span className="theme-text-secondary text-lg flex-shrink-0">
              📷
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 min-w-0 bg-transparent text-base sm:text-lg theme-text-primary placeholder:text-current/50 focus:outline-none font-mono"
              autoFocus={autoFocus}
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2 sm:gap-3 flex-shrink-0">
            {isCameraSupported && (
              <button
                onClick={() => setShowCameraScanner(true)}
                className="theme-chip rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 sm:px-3 py-2.5 sm:py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25 active:scale-95 touch-manipulation flex-1 sm:flex-initial items-center justify-center gap-1.5 sm:gap-0"
                title="Open camera scanner"
              >
                <span className="text-base sm:text-lg">📷</span>
                <span className="sm:hidden">Camera</span>
                <span className="hidden sm:inline">Camera</span>
              </button>
            )}
            {isBluetoothSupported && (
              <button
                onClick={connectBluetoothScanner}
                className="theme-chip rounded-full border border-purple-400/40 bg-purple-500/15 px-4 sm:px-3 py-2.5 sm:py-2 text-sm font-semibold text-purple-200 transition hover:bg-purple-500/25 active:scale-95 touch-manipulation flex-1 sm:flex-initial items-center justify-center gap-1.5 sm:gap-0"
                title="Connect Bluetooth scanner"
              >
                <span className="text-base sm:text-lg">📡</span>
                <span className="sm:hidden">BT</span>
                <span className="hidden sm:inline">Bluetooth</span>
              </button>
            )}
          </div>
        </div>
        {activeDevice && (
          <p className="text-xs theme-text-secondary text-center">
            Active scanner:{" "}
            <span className="font-semibold text-sky-400">
              {activeDevice.name}
            </span>
          </p>
        )}
        {!activeDevice && (
          <p className="text-xs theme-text-secondary text-center">
            💡 <strong className="theme-text-primary">Tip:</strong> USB scanners
            work automatically - just plug in and scan!
          </p>
        )}
        {input && (
          <p className="text-xs theme-text-secondary text-center">
            Press <kbd className="px-2 py-1 bg-white/10 rounded">Enter</kbd> or
            wait for auto-scan
          </p>
        )}
      </div>
      {showCameraScanner && (
        <CameraScanner
          isOpen={showCameraScanner}
          onScan={handleCameraScan}
          onClose={() => setShowCameraScanner(false)}
        />
      )}
    </>
  );
}
