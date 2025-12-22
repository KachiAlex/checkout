import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { useScannerDeviceStore } from "../stores/scannerDeviceStore";
import {
  registerUSBDevice,
  registerBluetoothDevice,
  registerCameraDevice,
  sendDeviceHeartbeat,
} from "../services/scannerDeviceService";
import { ensureCameraPermission } from "../services/scannerService";
import { useAuthStore } from "../stores/authStore";
import toast from "react-hot-toast";
import { debugLog } from "../utils/debugLog";
import { isNativePlatform } from "../utils/nativePlatform";
import { startNativeScan, stopNativeScan } from "../utils/nativeScanner";
import { NativeDeviceSummary } from "../types/nativeDevices";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
}

type ScanMode = "keyboard" | "camera" | "camera-snap" | "bluetooth";

export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [input, setInput] = useState("");
  const [scanMode, setScanMode] = useState<ScanMode>("keyboard");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isConnectingBluetooth, setIsConnectingBluetooth] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const usbDeviceRegisteredRef = useRef(false);
  const bluetoothDeviceRef = useRef<any | null>(null);

  const {
    addDevice,
    markDeviceUsed,
    setActiveDevice,
    getActiveDevice,
    updateDevice,
  } = useScannerDeviceStore();
  const { user } = useAuthStore();
  const activeDevice = getActiveDevice();
  const isNative = isNativePlatform();
  const [nativeScanning, setNativeScanning] = useState<"live" | "snap" | null>(
    null,
  );

  const selectNativeDevice = useCallback(
    async (type: "usb" | "bluetooth"): Promise<NativeDeviceSummary | null> => {
      if (
        typeof window === "undefined" ||
        !window.__IS_ELECTRON__ ||
        !window.posApp
      ) {
        return null;
      }

      if (typeof window.posApp.listNativeDevices !== "function") {
        toast.error(
          "Native device bridge unavailable. Reinstall the desktop app and try again.",
        );
        return null;
      }

      const devices =
        type === "bluetooth" &&
        typeof window.posApp.scanBluetoothDevices === "function"
          ? await window.posApp.scanBluetoothDevices(10_000)
          : await window.posApp.listNativeDevices();

      const filtered = devices.filter(
        (device) =>
          device.type === type ||
          (type === "bluetooth" && device.type === "unknown"),
      );

      if (filtered.length === 0) {
        toast.error(
          type === "usb"
            ? "No USB scanner detected from Windows. Connect your scanner and try again."
            : "No Bluetooth scanners detected. Pair the device in Windows settings first.",
        );
        return null;
      }

      if (filtered.length === 1) {
        return filtered[0];
      }

      const options = filtered
        .map((device, index) => {
          const vendor = device.vendorId
            ? device.vendorId.toString(16).padStart(4, "0")
            : "----";
          const product = device.productId
            ? device.productId.toString(16).padStart(4, "0")
            : "----";
          return `${index + 1}. ${device.name} (vendor: ${vendor}, product: ${product})`;
        })
        .join("\n");

      const choice = window.prompt(
        `Multiple devices detected. Enter the number of the ${type} device to use:\n${options}`,
        "1",
      );

      if (!choice) {
        toast("Cancelled selection");
        return null;
      }

      const selectedIndex = Number.parseInt(choice, 10) - 1;
      if (
        Number.isNaN(selectedIndex) ||
        selectedIndex < 0 ||
        selectedIndex >= filtered.length
      ) {
        toast.error("Invalid selection");
        return null;
      }

      return filtered[selectedIndex];
    },
    [],
  );

  // Handle rapid keyboard input from USB/Bluetooth scanners
  // Scanners typically send characters very quickly without Enter
  useEffect(() => {
    if (scanMode !== "keyboard") return;

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
          if (!usbDeviceRegisteredRef.current && scanMode === "keyboard") {
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
          inputEl.focus();
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
  }, [scanMode, onScan, markDeviceUsed, user?.id]);

  // Register USB scanner on mount
  const registerUSBScanner = useCallback(async () => {
    if (usbDeviceRegisteredRef.current) return;

    try {
      let nativeDevice: NativeDeviceSummary | undefined;
      const canUseNative =
        typeof window !== "undefined" &&
        Boolean(
          window.__IS_ELECTRON__ &&
            window.posApp &&
            typeof window.posApp.listNativeDevices === "function",
        );

      if (canUseNative) {
        const selected = await selectNativeDevice("usb");
        if (!selected) {
          return;
        }
        nativeDevice = selected;
      }

      const registeredDevice = await registerUSBDevice(
        user?.locationId,
        user?.id,
        nativeDevice,
      );
      const deviceId = addDevice(registeredDevice);
      setActiveDevice(deviceId);
      usbDeviceRegisteredRef.current = true;
      console.log("USB scanner registered:", registeredDevice.name);
      await sendDeviceHeartbeat(deviceId, user?.id);
    } catch (error) {
      console.warn("Failed to register USB scanner:", error);
      toast.error(
        "Unable to register USB scanner. Scans may still work as keyboard input.",
      );
    }
  }, [
    user?.locationId,
    user?.id,
    addDevice,
    setActiveDevice,
    selectNativeDevice,
  ]);

  // Auto-focus for keyboard scanners
  useEffect(() => {
    if (scanMode !== "keyboard") return;

    const inputEl = inputRef.current;
    if (!inputEl) return;

    inputEl.focus();

    const handleBlur = () => {
      // Only auto-focus if we're in keyboard mode
      if (scanMode === "keyboard") {
        setTimeout(() => {
          inputEl.focus();
        }, 100);
      }
    };

    inputEl.addEventListener("blur", handleBlur);
    return () => {
      inputEl.removeEventListener("blur", handleBlur);
    };
  }, [scanMode]);

  // Camera-based QR scanning (live streaming mode)
  const handleNativeScan = useCallback(
    async (mode: "live" | "snap") => {
      if (!isNative) return;
      if (nativeScanning) {
        debugLog(
          "Native scan request ignored because scan already in progress",
          {
            ongoingMode: nativeScanning,
            requestedMode: mode,
          },
        );
        return;
      }

      setNativeScanning(mode);
      debugLog("Native scan requested", { mode });

      try {
        const deviceData = await registerCameraDevice(
          user?.locationId,
          user?.id,
        );
        const deviceId = addDevice({
          ...deviceData,
          isActive: true,
        });
        setActiveDevice(deviceId);
        await sendDeviceHeartbeat(deviceId, user?.id);

        const content = await startNativeScan();

        if (content) {
          toast.success(`Scanned: ${content}`);
          debugLog("Native scan success", { content });
          markDeviceUsed(deviceId);
          sendDeviceHeartbeat(deviceId, user?.id).catch((err) =>
            console.warn("Failed to send heartbeat", err),
          );
          onScan(content);
        } else {
          toast.error("No barcode detected");
          debugLog("Native scan completed without content");
        }
      } catch (error: any) {
        debugLog("Native scan error", { message: error?.message });
        toast.error(error?.message || "Unable to start native scan");
      } finally {
        await stopNativeScan().catch(() => undefined);
        setNativeScanning(null);
        const currentActive = useScannerDeviceStore
          .getState()
          .getActiveDevice();
        if (currentActive?.type === "camera") {
          updateDevice(currentActive.id, { isActive: false });
        }
      }
    },
    [
      isNative,
      nativeScanning,
      user?.locationId,
      user?.id,
      addDevice,
      setActiveDevice,
      onScan,
      markDeviceUsed,
      updateDevice,
      sendDeviceHeartbeat,
    ],
  );

  const startCameraScan = useCallback(async () => {
    if (isNative) {
      handleNativeScan("live").catch(() => undefined);
      return;
    }

    try {
      setCameraError(null);
      setScanMode("camera");

      await new Promise<void>((resolve) => {
        if (typeof window !== "undefined") {
          window.requestAnimationFrame(() => resolve());
        } else {
          setTimeout(() => resolve(), 0);
        }
      });

      if (!videoRef.current) {
        debugLog("Camera live scan aborted: video element not ready");
        throw new Error("Camera preview not ready. Please try again.");
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported in this browser.");
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
        throw new Error("No camera devices found");
      }

      // Prefer rear camera if available (usually better for scanning)
      const rearCamera = videoInputDevices.find(
        (device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear") ||
          device.label.toLowerCase().includes("environment"),
      );
      const selectedDeviceId =
        rearCamera?.deviceId || videoInputDevices[0].deviceId;
      debugLog("Camera live scan initialised", {
        mode: "live",
        selectedDeviceId,
        deviceLabel: videoInputDevices.find(
          (device) => device.deviceId === selectedDeviceId,
        )?.label,
      });

      // Start scanning
      const result = await codeReader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText();
            if (text) {
              // Mark camera device as used
              const activeDevice = useScannerDeviceStore
                .getState()
                .getActiveDevice();
              if (activeDevice) {
                markDeviceUsed(activeDevice.id);
                sendDeviceHeartbeat(activeDevice.id, user?.id).catch((err) =>
                  console.warn("Failed to send heartbeat", err),
                );
              }

              toast.success(`Scanned: ${text}`);
              debugLog("Camera live scan decoded", { text });
              onScan(text);
              stopCameraScan();
            }
          }
          if (error && error.name !== "NotFoundException") {
            // NotFoundException is normal when scanning (no code found yet)
            console.warn("Camera scan error:", error);
            debugLog("Camera live scan warning", {
              errorName: error.name,
              message: error.message,
            });
          }
        },
      );

      console.log("Camera scanning started:", result);
    } catch (error: any) {
      console.error("Failed to start camera:", error);
      debugLog("Camera live scan failed", {
        errorName: error?.name,
        message: error?.message,
      });
      setCameraError(error.message || "Failed to access camera");
      setScanMode("keyboard");
      toast.error(error.message || "Failed to access camera");
    }
  }, [
    onScan,
    user?.locationId,
    user?.id,
    addDevice,
    setActiveDevice,
    markDeviceUsed,
    handleNativeScan,
    isNative,
  ]);

  // Camera snap & decode mode (better for low light)
  const startCameraSnapMode = useCallback(async () => {
    if (isNative) {
      handleNativeScan("snap").catch(() => undefined);
      return;
    }

    try {
      setCameraError(null);
      setScanMode("camera-snap");

      await new Promise<void>((resolve) => {
        if (typeof window !== "undefined") {
          window.requestAnimationFrame(() => resolve());
        } else {
          setTimeout(() => resolve(), 0);
        }
      });

      if (!videoRef.current || !canvasRef.current) {
        debugLog("Camera snap mode aborted: video or canvas not ready");
        throw new Error("Camera preview not ready. Please try again.");
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported in this browser.");
      }

      await ensureCameraPermission();

      // Register camera device
      const deviceData = await registerCameraDevice(user?.locationId, user?.id);
      const deviceId = addDevice({
        ...deviceData,
        name: `${deviceData.name || "Camera Scanner"} (Snap Mode)`,
        isActive: true,
      });
      setActiveDevice(deviceId);
      await sendDeviceHeartbeat(deviceId, user?.id);

      // Get available video devices
      const codeReader = new BrowserMultiFormatReader();
      const videoInputDevices = await codeReader.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        throw new Error("No camera devices found");
      }

      // Prefer rear camera if available
      const rearCamera = videoInputDevices.find(
        (device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear") ||
          device.label.toLowerCase().includes("environment"),
      );
      const selectedDeviceId =
        rearCamera?.deviceId || videoInputDevices[0].deviceId;
      debugLog("Camera snap mode initialised", {
        mode: "snap",
        selectedDeviceId,
        deviceLabel: videoInputDevices.find(
          (device) => device.deviceId === selectedDeviceId,
        )?.label,
      });

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: selectedDeviceId },
          facingMode: "environment", // Prefer rear camera
        },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.play();

      // Set canvas dimensions to match video
      videoRef.current.addEventListener("loadedmetadata", () => {
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }
      });

      console.log("Camera snap mode ready");
    } catch (error: any) {
      console.error("Failed to start camera snap mode:", error);
      debugLog("Camera snap mode failed", {
        errorName: error?.name,
        message: error?.message,
      });
      setCameraError(error.message || "Failed to access camera");
      setScanMode("keyboard");
      toast.error(error.message || "Failed to access camera");
    }
  }, [
    user?.locationId,
    user?.id,
    addDevice,
    setActiveDevice,
    handleNativeScan,
    isNative,
  ]);

  // Capture and decode a single frame
  const captureAndDecode = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) {
      toast.error("Camera not ready");
      return;
    }

    setIsCapturing(true);
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to image data URL and decode
      const imageDataUrl = canvas.toDataURL("image/png");
      const img = new Image();
      img.src = imageDataUrl;

      // Wait for image to load, then decode
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Decode the captured image
      const codeReader = new BrowserMultiFormatReader();
      const result = await codeReader.decodeFromImageElement(img);

      if (result) {
        const text = result.getText();
        if (text) {
          // Mark camera device as used
          const activeDevice = useScannerDeviceStore
            .getState()
            .getActiveDevice();
          if (activeDevice) {
            markDeviceUsed(activeDevice.id);
            sendDeviceHeartbeat(activeDevice.id, user?.id).catch((err) =>
              console.warn("Failed to send heartbeat", err),
            );
          }

          toast.success(`Scanned: ${text}`);
          onScan(text);
          debugLog("Camera snap capture decoded", { text });
          stopCameraScan();
        }
      }
    } catch (error: any) {
      if (error.name !== "NotFoundException") {
        console.error("Decode error:", error);
        toast.error("No barcode/QR code found in image. Try again.");
        debugLog("Camera snap capture decode error", {
          errorName: error.name,
          message: error.message,
        });
      } else {
        toast.error("No barcode/QR code found. Try again.");
      }
    } finally {
      setIsCapturing(false);
    }
  }, [onScan, markDeviceUsed, user?.id]);

  const stopCameraScan = useCallback(() => {
    if (isNative) {
      stopNativeScan().catch(() => undefined);
      setNativeScanning(null);
      return;
    }

    // Stop code reader
    if (codeReaderRef.current && videoRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Deactivate camera device
    const activeDevice = useScannerDeviceStore.getState().getActiveDevice();
    if (activeDevice && activeDevice.type === "camera") {
      useScannerDeviceStore
        .getState()
        .updateDevice(activeDevice.id, { isActive: false });
      sendDeviceHeartbeat(activeDevice.id, user?.id, { isActive: false }).catch(
        (err) => console.warn("Failed to send heartbeat", err),
      );
      setActiveDevice(null);
    }

    setScanMode("keyboard");
    setCameraError(null);
    setIsCapturing(false);
    debugLog("Camera scan stopped");

    // Refocus keyboard input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [setActiveDevice, isNative]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCameraScan();
    };
  }, [stopCameraScan]);

  // Bluetooth scanner support (Web Bluetooth API)
  const connectBluetoothScanner = useCallback(async () => {
    if (isConnectingBluetooth) return;

    try {
      setIsConnectingBluetooth(true);
      setCameraError(null);

      const nativeBridgeAvailable =
        typeof window !== "undefined" &&
        Boolean(
          window.__IS_ELECTRON__ &&
            window.posApp &&
            typeof window.posApp.listNativeDevices === "function",
        );

      if (nativeBridgeAvailable && window.posApp) {
        toast.loading("Checking Windows for Bluetooth scanners...", {
          id: "bluetooth-connect",
        });
        const selected = await selectNativeDevice("bluetooth");
        if (!selected) {
          toast.dismiss("bluetooth-connect");
          return;
        }

        const deviceData = await registerBluetoothDevice(
          {
            ...selected,
            type: "bluetooth",
          },
          user?.locationId,
          user?.id,
        );

        const deviceId = addDevice({
          ...deviceData,
          isActive: true,
        });
        setActiveDevice(deviceId);
        usbDeviceRegisteredRef.current = true;
        await sendDeviceHeartbeat(deviceId, user?.id);
        toast.dismiss("bluetooth-connect");
        toast.success(
          `Bluetooth scanner "${deviceData.name}" connected through Windows`,
        );
        setCameraError(null);
        setScanMode("keyboard");
        return;
      }

      if (!(navigator as any).bluetooth) {
        throw new Error(
          "Web Bluetooth API not supported. Use Chrome/Edge on desktop or Android.",
        );
      }

      // Check if we're on HTTPS or localhost
      const isSecure =
        window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (!isSecure) {
        throw new Error(
          "Bluetooth requires HTTPS or localhost. Please use a secure connection.",
        );
      }

      toast.loading("Searching for Bluetooth scanners...", {
        id: "bluetooth-connect",
      });

      const permissionsApi = (navigator as any).permissions;
      if (permissionsApi?.query) {
        try {
          const status: PermissionStatus = await permissionsApi.query({
            name: "bluetooth",
          } as unknown as PermissionDescriptor);

          if (status.state === "denied") {
            throw new Error(
              "Bluetooth access is blocked. Please allow Bluetooth access for this site in your browser settings and try again.",
            );
          }
        } catch (permError) {
          const message =
            permError instanceof Error ? permError.message : String(permError);

          if (!message.includes("not a valid enum value")) {
            console.warn(
              "Unable to query Bluetooth permission state:",
              permError,
            );
          }
        }
      }

      // Request Bluetooth device - this will show the browser's device chooser
      // We'll accept HID devices (keyboard scanners) or generic devices
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          // HID (Human Interface Device) - most barcode scanners act as keyboards
          { services: ["00001812-0000-1000-8000-00805f9b34fb"] },
          // Generic device with name containing "scanner" or "barcode"
          { namePrefix: "Scanner" },
          { namePrefix: "Barcode" },
          { namePrefix: "QR" },
        ],
        optionalServices: [
          "battery_service",
          "device_information",
          "00001812-0000-1000-8000-00805f9b34fb", // HID Service
        ],
      });

      console.log("Bluetooth device selected:", device.name);
      toast.dismiss("bluetooth-connect");
      toast.loading("Connecting to device...", { id: "bluetooth-connect" });

      // Connect to GATT server if available
      if (device.gatt) {
        try {
          const server = await device.gatt.connect();
          console.log("GATT server connected:", server);

          // Try to get battery level if available
          try {
            const batteryService =
              await server.getPrimaryService("battery_service");
            const batteryLevelCharacteristic =
              await batteryService.getCharacteristic("battery_level");
            const batteryLevel = await batteryLevelCharacteristic.readValue();
            const level = batteryLevel.getUint8(0);
            console.log("Battery level:", level + "%");
          } catch (e) {
            // Battery service not available, that's okay
            console.log("Battery service not available");
          }
        } catch (gattError) {
          console.warn(
            "GATT connection failed (device may be HID-only):",
            gattError,
          );
          // HID devices don't need GATT connection, they work as keyboards
        }
      }

      // Register Bluetooth device
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

      // For HID devices, the scanner will act as a keyboard
      // The keyboard input handler will catch the scans
      setScanMode("keyboard");

      // Monitor connection
      device.addEventListener("gattserverdisconnected", () => {
        console.log("Bluetooth scanner disconnected");
        toast.error(`Bluetooth scanner "${device.name}" disconnected`);
        // Update device status
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
      toast.success(
        `Bluetooth scanner "${device.name}" connected! It will work as a keyboard scanner.`,
      );
      setCameraError(null);
    } catch (error: any) {
      toast.dismiss("bluetooth-connect");

      if (error.name === "NotFoundError") {
        const errorMsg =
          "No Bluetooth scanner found nearby. Make sure your scanner is powered on and in pairing mode.";
        setCameraError(errorMsg);
        toast.error(errorMsg);
      } else if (error.name === "SecurityError") {
        const errorMsg =
          "Bluetooth access denied. Please allow Bluetooth access in your browser settings.";
        setCameraError(errorMsg);
        toast.error(errorMsg);
      } else if (error.name === "AbortError") {
        // User cancelled the device chooser - don't show error
        console.log("User cancelled Bluetooth device selection");
      } else {
        const errorMsg = error.message || "Failed to connect Bluetooth scanner";
        setCameraError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setIsConnectingBluetooth(false);
    }
  }, [
    user?.locationId,
    user?.id,
    addDevice,
    setActiveDevice,
    isConnectingBluetooth,
    selectNativeDevice,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If Enter is pressed and input has value, treat as barcode scan
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      onScan(input.trim());
      setInput("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const isBluetoothSupported =
    typeof navigator !== "undefined" && "bluetooth" in (navigator as any);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-6 shadow-lg">
      <div className="flex flex-col gap-4 mb-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="text-3xl">📷</div>
        <div className="flex-1">
          <label className="block text-lg font-bold text-gray-800 mb-1">
            Scan Barcode or QR Code
          </label>
          <p className="text-sm text-gray-600">
            {isNative ? (
              nativeScanning ? (
                "Native camera active – point at a barcode to scan."
              ) : (
                "Tap a button below to launch the native camera scanner."
              )
            ) : (
              <>
                {scanMode === "keyboard" && (
                  <>
                    USB/Bluetooth scanner or type barcode
                    {activeDevice && (
                      <span className="ml-2 text-blue-700 font-medium">
                        • Active: {activeDevice.name}
                      </span>
                    )}
                  </>
                )}
                {scanMode === "camera" &&
                  "Live camera scanning - point at QR code"}
                {scanMode === "camera-snap" &&
                  'Snap mode - click "Capture" to scan'}
                {scanMode === "bluetooth" && "Bluetooth scanner connected"}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
          {isNative ? (
            <>
              <button
                onClick={() => handleNativeScan("live")}
                disabled={nativeScanning !== null}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-60 sm:w-auto"
              >
                📷 Live Scan
              </button>
              <button
                onClick={() => handleNativeScan("snap")}
                disabled={nativeScanning !== null}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-60 sm:w-auto"
              >
                📸 Snap Mode
              </button>
            </>
          ) : scanMode === "camera" || scanMode === "camera-snap" ? (
            <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
              {scanMode === "camera-snap" && (
                <button
                  onClick={captureAndDecode}
                  disabled={isCapturing}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium sm:w-auto"
                  title="Capture and decode current frame"
                >
                  {isCapturing ? "⏳ Decoding..." : "📸 Capture"}
                </button>
              )}
              <button
                onClick={stopCameraScan}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium sm:w-auto"
              >
                Stop Camera
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  debugLog("Live scan button pressed", {
                    hasMediaDevices:
                      typeof navigator !== "undefined" &&
                      Boolean(navigator.mediaDevices),
                    scanMode,
                    platform:
                      typeof navigator !== "undefined"
                        ? navigator.userAgent
                        : "unknown",
                  });
                  startCameraScan();
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium sm:w-auto"
                title="Live camera scanning (continuous)"
              >
                📷 Live Scan
              </button>
              <button
                onClick={() => {
                  debugLog("Snap mode button pressed", {
                    hasMediaDevices:
                      typeof navigator !== "undefined" &&
                      Boolean(navigator.mediaDevices),
                    scanMode,
                    platform:
                      typeof navigator !== "undefined"
                        ? navigator.userAgent
                        : "unknown",
                  });
                  startCameraSnapMode();
                }}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium sm:w-auto"
                title="Snap & decode mode (better for low light)"
              >
                📸 Snap Mode
              </button>
              {isBluetoothSupported && (
                <button
                  onClick={connectBluetoothScanner}
                  disabled={isConnectingBluetooth}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 text-sm font-medium sm:w-auto"
                  title="Connect Bluetooth scanner (will prompt for device selection)"
                >
                  {isConnectingBluetooth ? "⏳ Connecting..." : "📡 Bluetooth"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {isNative ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-sm text-gray-600 shadow-inner shadow-black/40">
          {nativeScanning ? (
            <p className="text-center text-blue-600 font-semibold">Scanning…</p>
          ) : (
            <p className="text-center">
              Native camera preview opens fullscreen when scanning starts.
            </p>
          )}
        </div>
      ) : scanMode === "camera" || scanMode === "camera-snap" ? (
        <div className="space-y-2">
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded-lg border-2 border-blue-400 bg-black"
              style={{ maxHeight: "300px", objectFit: "contain" }}
              playsInline
              autoPlay
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            {scanMode === "camera-snap" && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-xs">
                Snap Mode Active
              </div>
            )}
          </div>
          {cameraError && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {cameraError}
            </p>
          )}
          <p className="text-xs text-gray-600 text-center">
            {scanMode === "camera"
              ? "Point your camera at a QR code or barcode (auto-detects)"
              : 'Point camera at QR code, then click "Capture" to scan'}
          </p>
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scan barcode/QR with scanner, or type and press Enter..."
          className="w-full px-6 py-4 text-xl border-2 border-blue-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-600 bg-white shadow-inner font-mono"
          autoFocus
          autoComplete="off"
        />
      )}

      {scanMode === "keyboard" && input && (
        <p className="mt-2 text-sm text-gray-600">
          Press <kbd className="px-2 py-1 bg-gray-200 rounded">Enter</kbd> or
          wait for auto-scan
        </p>
      )}

      {!isBluetoothSupported && (
        <p className="mt-2 text-xs text-gray-500 text-center">
          💡 Bluetooth scanning requires Chrome/Edge on desktop or Android
        </p>
      )}
    </div>
  );
}
