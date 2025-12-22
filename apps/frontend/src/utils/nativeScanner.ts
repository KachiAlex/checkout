import { BarcodeScanner } from "@capacitor-community/barcode-scanner";
import { debugLog } from "./debugLog";

let scannerActive = false;

export async function ensureNativeScannerPermission() {
  debugLog("Native barcode scanner: checking permission");
  const status = await BarcodeScanner.checkPermission({ force: false });
  debugLog("Native barcode scanner: current permission status", status);

  if (status.granted || status.restricted) {
    return true;
  }

  if (status.denied) {
    throw new Error(
      "Camera permission denied permanently. Enable it in Android settings.",
    );
  }

  const request = await BarcodeScanner.checkPermission({ force: true });
  debugLog("Native barcode scanner: permission request result", request);

  if (request.granted || request.restricted) {
    return true;
  }

  return false;
}

export async function startNativeScan(): Promise<string | null> {
  const permission = await ensureNativeScannerPermission();
  if (!permission) {
    return null;
  }

  debugLog("Native barcode scanner: starting scan");

  scannerActive = true;
  await BarcodeScanner.hideBackground();
  document.body.classList.add("scanner-active");

  try {
    const result = await BarcodeScanner.startScan({});
    debugLog("Native barcode scanner: result", result);
    if (result?.hasContent) {
      return result.content ?? null;
    }
    return null;
  } finally {
    await stopNativeScan();
  }
}

export async function stopNativeScan() {
  if (!scannerActive) {
    return;
  }

  debugLog("Native barcode scanner: stopping scan");
  scannerActive = false;
  try {
    await BarcodeScanner.stopScan();
  } catch (error) {
    debugLog("Native barcode scanner: stop error", {
      message: (error as Error).message,
    });
  }
  await BarcodeScanner.showBackground();
  document.body.classList.remove("scanner-active");
}
