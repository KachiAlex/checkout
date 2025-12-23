import axios from "axios";
import { API_URL } from "../config";
import { ScannerDevice } from "../stores/scannerDeviceStore";
import { useAuthStore } from "../stores/authStore";
import { NativeDeviceSummary } from "../types/nativeDevices";

type WebBluetoothDevice = {
  id: string;
  name?: string;
  gatt?: {
    connect(): Promise<any>;
    disconnect?: () => void;
    getPrimaryService?: (uuid: string) => Promise<any>;
  };
};

interface DeviceResponse {
  id: string;
  identifier: string;
  name: string;
  type: "usb" | "bluetooth" | "camera";
  hardwareId?: string;
  vendorId?: string;
  productId?: string;
  locationId?: string;
  registeredById?: string;
  lastUsedById?: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  lastSeenAt?: string;
  lastUsedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

function mapDeviceResponse(
  device: DeviceResponse,
  fallbackDeviceId?: string,
): ScannerDevice {
  return {
    id: device.id,
    name: device.name,
    type: device.type,
    deviceId: device.hardwareId ?? device.identifier ?? fallbackDeviceId,
    vendorId: device.vendorId,
    productId: device.productId,
    connectedAt: device.createdAt ? new Date(device.createdAt) : new Date(),
    lastUsedAt: device.lastUsedAt ? new Date(device.lastUsedAt) : new Date(),
    locationId: device.locationId,
    userId: device.lastUsedById ?? device.registeredById,
    isActive: device.isActive,
    metadata: device.metadata,
  };
}

const getTenantSlug = (): string => {
  const slug = useAuthStore.getState().tenantSlug;
  if (!slug) {
    throw new Error("Tenant context missing. Please log in again.");
  }
  return slug;
};

async function persistDevice(
  payload: Record<string, unknown>,
  fallbackDeviceId?: string,
): Promise<ScannerDevice> {
  const response = await axios.post<{ data?: DeviceResponse } | DeviceResponse>(
    `${API_URL}/api/v1/devices/register`,
    payload,
    {
      headers: {
        "X-Tenant-Slug": getTenantSlug(),
      },
    },
  );

  const device =
    (response as any).data?.data ?? (response as any).data ?? response.data;
  return mapDeviceResponse(device, fallbackDeviceId);
}

export async function fetchRegisteredDevices(
  locationId?: string,
): Promise<ScannerDevice[]> {
  const response = await axios.get<DeviceResponse[]>(
    `${API_URL}/api/v1/devices`,
    {
      params: locationId ? { location_id: locationId } : undefined,
    },
  );

  return response.data.map((device) => mapDeviceResponse(device));
}

/**
 * Get USB device information if available
 * Note: Most USB barcode scanners work as HID keyboards and don't need Web USB API.
 * They automatically type into input fields. This function is for scanners that
 * support Web USB API (less common).
 */
export async function getUSBDeviceInfo(): Promise<{
  vendorId?: string;
  productId?: string;
  deviceName?: string;
} | null> {
  if (typeof navigator === "undefined") {
    return null;
  }
  const nav = navigator as Navigator & { usb?: any };
  if (!nav.usb) {
    // Web USB API not available - this is normal for most browsers
    // USB HID scanners work as keyboards and don't need this API
    return null;
  }

  try {
    // Request access to USB devices (requires user permission)
    const devices = await nav.usb.getDevices();
    if (devices.length === 0) {
      // No devices with permission yet - user needs to grant access
      return null;
    }

    // Get the first connected USB device (scanner)
    const device = devices[0];
    return {
      vendorId: device.vendorId?.toString(16).padStart(4, "0"),
      productId: device.productId?.toString(16).padStart(4, "0"),
      deviceName: device.productName || "USB Scanner",
    };
  } catch (error) {
    console.warn("Failed to get USB device info:", error);
    return null;
  }
}

/**
 * Request USB device access (for scanners that support Web USB API)
 * Most USB scanners work as HID keyboards and don't need this.
 */
export async function requestUSBDeviceAccess(): Promise<{
  vendorId?: string;
  productId?: string;
  deviceName?: string;
} | null> {
  if (typeof navigator === "undefined") {
    return null;
  }
  const nav = navigator as Navigator & { usb?: any };
  if (!nav.usb) {
    throw new Error(
      "Web USB API not supported. Most USB scanners work automatically as keyboards.",
    );
  }

  try {
    // Request access to a USB device
    // This will show a browser dialog for the user to select a device
    const device = await nav.usb.requestDevice({
      filters: [
        // Common barcode scanner vendor IDs (optional - can be removed to show all devices)
        // { vendorId: 0x05e0 }, // Symbol Technologies
        // { vendorId: 0x0c2e }, // Honeywell
      ],
    });

    return {
      vendorId: device.vendorId?.toString(16).padStart(4, "0"),
      productId: device.productId?.toString(16).padStart(4, "0"),
      deviceName: device.productName || "USB Scanner",
    };
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      throw new Error("No USB device selected.");
    } else if (error.name === "SecurityError") {
      throw new Error(
        "USB access denied. Most USB scanners work automatically as keyboards.",
      );
    }
    throw error;
  }
}

/**
 * Get Bluetooth device information
 */
export function getBluetoothDeviceInfo(device: WebBluetoothDevice): {
  deviceId: string;
  name: string;
  metadata?: {
    manufacturer?: string;
    model?: string;
  };
} {
  return {
    deviceId: device.id,
    name: device.name || "Bluetooth Scanner",
    metadata: {
      manufacturer: device.name?.split(" ")[0],
      model: device.name,
    },
  };
}

/**
 * Generate a device name based on type and available info
 */
export function generateDeviceName(
  type: "usb" | "bluetooth" | "camera",
  deviceInfo?: {
    name?: string;
    vendorId?: string;
    productId?: string;
    deviceName?: string;
  },
): string {
  switch (type) {
    case "usb":
      if (deviceInfo?.name) return deviceInfo.name;
      if (deviceInfo?.vendorId && deviceInfo?.productId) {
        return `USB Scanner (${deviceInfo.vendorId}:${deviceInfo.productId})`;
      }
      return "USB Scanner";

    case "bluetooth":
      return deviceInfo?.name || "Bluetooth Scanner";

    case "camera":
      return "Camera Scanner";

    default:
      return "Unknown Scanner";
  }
}

/**
 * Register a USB scanner device
 * Note: Most USB scanners work as HID keyboards and are automatically detected
 * when they scan. This function is for registering them in the system for tracking.
 */
function formatHex(value?: number): string | undefined {
  if (typeof value !== "number") {
    return undefined;
  }
  return value.toString(16).padStart(4, "0");
}

function buildNativePayload(
  device: NativeDeviceSummary,
  locationId?: string,
  userId?: string,
): {
  identifier: string;
  name: string;
  type: "usb" | "bluetooth";
  hardwareId?: string;
  vendorId?: string;
  productId?: string;
  locationId?: string;
  registeredById?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
} {
  const identifierSource = device.path || device.serialNumber || device.id;
  const identifier = identifierSource
    ? identifierSource.toLowerCase()
    : `${device.type}_${Date.now()}`;

  const vendorId = formatHex(device.vendorId);
  const productId = formatHex(device.productId);

  return {
    identifier,
    name:
      device.name ||
      (device.type === "usb" ? "USB Scanner" : "Bluetooth Scanner"),
    type: device.type === "bluetooth" ? "bluetooth" : "usb",
    hardwareId: device.serialNumber || identifier,
    vendorId,
    productId,
    locationId,
    registeredById: userId,
    metadata: {
      manufacturer: device.manufacturer,
      transport: device.transport,
      source: "native-bridge",
    },
    isActive: true,
  };
}

export async function registerNativeDevice(
  device: NativeDeviceSummary,
  locationId?: string,
  userId?: string,
): Promise<ScannerDevice> {
  const payload = buildNativePayload(device, locationId, userId);
  return persistDevice(payload, payload.identifier);
}

export async function registerUSBDevice(
  locationId?: string,
  userId?: string,
  nativeDevice?: NativeDeviceSummary,
): Promise<ScannerDevice> {
  if (nativeDevice) {
    return registerNativeDevice(nativeDevice, locationId, userId);
  }

  const usbInfo = await getUSBDeviceInfo();

  const identifier =
    usbInfo?.vendorId && usbInfo?.productId
      ? `${usbInfo.vendorId}:${usbInfo.productId}`.toLowerCase()
      : `usb_${Date.now()}`;

  const payload = {
    identifier,
    name: generateDeviceName("usb", usbInfo ?? undefined),
    type: "usb" as const,
    hardwareId: identifier,
    vendorId: usbInfo?.vendorId,
    productId: usbInfo?.productId,
    locationId,
    registeredById: userId,
    metadata: {
      manufacturer: usbInfo?.deviceName?.split(" ")[0],
      deviceName: usbInfo?.deviceName || "USB HID Scanner (Keyboard Mode)",
      note: "Most USB scanners work automatically as keyboards. Just plug in and scan.",
    },
    isActive: true,
  };

  return persistDevice(payload, identifier);
}

/**
 * Register a Bluetooth scanner device
 */
export async function registerBluetoothDevice(
  bluetoothDevice: WebBluetoothDevice | NativeDeviceSummary,
  locationId?: string,
  userId?: string,
): Promise<ScannerDevice> {
  if ("type" in bluetoothDevice) {
    return registerNativeDevice(
      {
        ...bluetoothDevice,
        type: "bluetooth",
      },
      locationId,
      userId,
    );
  }

  const deviceInfo = getBluetoothDeviceInfo(bluetoothDevice);
  const identifier = deviceInfo.deviceId || `bluetooth_${Date.now()}`;

  const payload = {
    identifier: identifier.toLowerCase(),
    name: deviceInfo.name,
    type: "bluetooth" as const,
    hardwareId: deviceInfo.deviceId,
    locationId,
    registeredById: userId,
    metadata: deviceInfo.metadata,
    isActive: true,
  };

  return persistDevice(payload, identifier);
}

/**
 * Register a camera scanner device
 */
export async function registerCameraDevice(
  locationId?: string,
  userId?: string,
): Promise<ScannerDevice> {
  const identifier = `camera_${Date.now()}`;

  const payload = {
    identifier,
    name: "Camera Scanner",
    type: "camera" as const,
    hardwareId: identifier,
    locationId,
    registeredById: userId,
    metadata: {
      manufacturer: navigator.userAgent.includes("Chrome")
        ? "Google"
        : "Browser",
      userAgent: navigator.userAgent,
    },
    isActive: false,
  };

  return persistDevice(payload, identifier);
}

export async function sendDeviceHeartbeat(
  deviceId: string,
  userId?: string,
  options?: { isActive?: boolean },
): Promise<void> {
  if (!deviceId) return;

  try {
    await axios.post(`${API_URL}/api/v1/devices/${deviceId}/heartbeat`, {
      userId,
      isActive: options?.isActive ?? true,
    });
  } catch (error) {
    console.warn("Failed to send device heartbeat", error);
  }
}
