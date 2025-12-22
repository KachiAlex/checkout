import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import { debugLog } from "../utils/debugLog";

/**
 * Scanner Service
 *
 * Handles different types of barcode/QR scanners:
 * 1. USB HID Keyboards - Most common type, scanners act as keyboards
 * 2. Bluetooth HID - Similar to USB, but wireless
 * 3. Camera-based - Uses device camera and ZXing library
 *
 * Usage:
 * - USB/Bluetooth scanners: Just connect and scan - they work automatically
 * - Camera: Click "Camera" button to start QR scanning
 * - Bluetooth: Click "Bluetooth" button to pair (requires Chrome/Edge)
 */

export interface ScannerConfig {
  autoDetectSpeed: number; // ms - time to wait after last character for auto-scan
  minBarcodeLength: number; // Minimum characters to consider a valid barcode
  enableCamera: boolean;
  enableBluetooth: boolean;
}

export const defaultScannerConfig: ScannerConfig = {
  autoDetectSpeed: 150,
  minBarcodeLength: 4,
  enableCamera: true,
  enableBluetooth: true,
};

/**
 * Check if Web Bluetooth API is supported
 */
export function isBluetoothSupported(): boolean {
  if (typeof navigator === "undefined") return false;

  const isNative =
    typeof Capacitor?.isNativePlatform === "function"
      ? Capacitor.isNativePlatform()
      : Capacitor?.getPlatform?.() !== "web";

  if (isNative) {
    return false;
  }

  const nav = navigator as Navigator & { bluetooth?: any };
  return Boolean(nav.bluetooth);
}

/**
 * Check if camera access is available
 */
export async function checkCameraAvailability(): Promise<boolean> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === "videoinput");
  } catch {
    return false;
  }
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.error("Camera permission denied:", error);
    return false;
  }
}

/**
 * Ensure camera permission is granted, requesting it when necessary.
 * Throws an error if the permission has been blocked.
 */
export async function ensureCameraPermission(): Promise<void> {
  const isNative =
    typeof Capacitor?.isNativePlatform === "function"
      ? Capacitor.isNativePlatform()
      : Capacitor?.getPlatform?.() !== "web";

  if (isNative) {
    try {
      debugLog("Checking native camera permissions");
      const status = await Camera.checkPermissions();
      debugLog("Native camera permission status", status);

      if (status.camera === "granted" || status.camera === "limited") {
        return;
      }

      if (status.camera === "denied") {
        debugLog("Native camera permission denied");
        throw new Error(
          "Camera access is blocked for this app. Enable the camera permission in Android Settings and try again.",
        );
      }

      debugLog("Requesting native camera permissions");
      const requestResult = await Camera.requestPermissions({
        permissions: ["camera"],
      });
      debugLog("Native camera permission request result", requestResult);

      if (
        requestResult.camera === "granted" ||
        requestResult.camera === "limited"
      ) {
        return;
      }

      throw new Error(
        "Camera permission was not granted on this device. Allow access in system settings and retry.",
      );
    } catch (error) {
      console.warn("Capacitor camera permission request failed", error);
      debugLog("Native camera permission request failed", {
        errorName: (error as any)?.name,
        message: (error as any)?.message,
      });
      throw error instanceof Error
        ? error
        : new Error(
            "Unable to access camera. Check device permissions and try again.",
          );
    }
  }

  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    debugLog("Camera access not supported in this browser");
    throw new Error("Camera access is not supported in this browser.");
  }

  const permissionsApi = (navigator as any).permissions;

  if (permissionsApi?.query) {
    try {
      const status: PermissionStatus = await permissionsApi.query({
        name: "camera",
      } as PermissionDescriptor);
      debugLog("Web camera permission status", { state: status.state });

      if (status.state === "granted") {
        return;
      }

      if (status.state === "denied") {
        throw new Error(
          "Camera access is blocked. Please allow camera access for this site in your browser settings and try again.",
        );
      }

      // state === 'prompt' – trigger the permission request
      const granted = await requestCameraPermission();
      if (!granted) {
        throw new Error(
          "Camera permission was not granted. Please allow camera access in the browser prompt.",
        );
      }
      return;
    } catch (error) {
      console.warn("Permissions API not available for camera check:", error);
      // Fallback to direct request below
    }
  }

  debugLog("Requesting camera permission via direct getUserMedia");
  const granted = await requestCameraPermission();
  if (!granted) {
    throw new Error(
      "Camera permission was not granted. Please allow camera access in your browser settings.",
    );
  }
}

/**
 * Detect if input is from a scanner (rapid input) vs manual typing
 */
export function isLikelyScannerInput(
  currentTime: number,
  lastCharTime: number,
  threshold: number = 100, // ms
): boolean {
  return currentTime - lastCharTime < threshold;
}

/**
 * Bluetooth scanner connection helper
 */
export async function connectBluetoothScanner(): Promise<any | null> {
  if (!isBluetoothSupported()) {
    throw new Error(
      "Web Bluetooth API not supported. Use Chrome/Edge on desktop or Android.",
    );
  }

  try {
    const nav = navigator as Navigator & { bluetooth?: any };
    const bluetooth = nav.bluetooth;
    if (!bluetooth) {
      throw new Error("Web Bluetooth API not available.");
    }
    // Request device with HID service (Human Interface Device)
    // Most Bluetooth scanners use HID profile
    const device = await bluetooth.requestDevice({
      filters: [
        // HID Service UUID
        { services: ["00001812-0000-1000-8000-00805f9b34fb"] },
        // Generic access profile
        { services: ["00001800-0000-1000-8000-00805f9b34fb"] },
      ],
      optionalServices: [
        "battery_service",
        "device_information",
        "00001812-0000-1000-8000-00805f9b34fb", // HID
      ],
    });

    return device;
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      throw new Error(
        "No Bluetooth scanner found. Make sure it is in pairing mode.",
      );
    } else if (error.name === "SecurityError") {
      throw new Error(
        "Bluetooth access denied. Please allow in browser settings.",
      );
    } else if (error.name === "AbortError") {
      throw new Error("Bluetooth pairing cancelled.");
    }
    throw error;
  }
}
