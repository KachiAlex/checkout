import axios from "axios";
import { API_URL } from "../config";
import { useAuthStore } from "../stores/authStore";

export interface PrinterDevice {
  id: string;
  name: string;
  type: "usb" | "bluetooth" | "network" | "escpos-proxy";
  connectionType: "serial" | "bluetooth" | "network" | "websocket";
  port?: SerialPort;
  bluetoothDevice?: BluetoothDevice;
  config?: {
    baudRate?: number;
    dataBits?: number;
    stopBits?: number;
    parity?: "none" | "even" | "odd";
    host?: string;
    port?: number;
  };
  isConnected: boolean;
  locationId?: string;
  registeredById?: string;
  lastUsedAt?: Date;
  metadata?: Record<string, unknown>;
}

interface RegisterPrinterInput {
  identifier: string;
  name: string;
  type: "usb" | "bluetooth" | "network" | "escpos-proxy";
  connectionType: "serial" | "bluetooth" | "network" | "websocket";
  hardwareId?: string;
  vendorId?: string;
  productId?: string;
  locationId?: string;
  config?: {
    baudRate?: number;
    dataBits?: number;
    stopBits?: number;
    parity?: "none" | "even" | "odd";
    host?: string;
    port?: number;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Check if Web Serial API is supported
 */
export function isSerialAPISupported(): boolean {
  return "serial" in navigator;
}

/**
 * Check if Web Bluetooth API is supported
 */
export function isBluetoothAPISupported(): boolean {
  return "bluetooth" in navigator;
}

/**
 * Request access to USB/Serial printer using Web Serial API
 */
export async function requestSerialPrinter(): Promise<SerialPort | null> {
  if (!isSerialAPISupported()) {
    throw new Error(
      "Web Serial API not supported. Use Chrome/Edge on desktop.",
    );
  }

  try {
    const port = await (navigator as any).serial.requestPort();
    return port;
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      throw new Error("No serial port selected.");
    } else if (error.name === "SecurityError") {
      throw new Error("Serial port access denied.");
    }
    throw error;
  }
}

/**
 * Connect to a serial port with configuration
 */
export async function connectSerialPort(
  port: SerialPort,
  options: {
    baudRate?: number;
    dataBits?: 7 | 8;
    stopBits?: 1 | 2;
    parity?: "none" | "even" | "odd";
  } = {},
): Promise<void> {
  const defaultOptions: SerialOptions = {
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    ...options,
  };

  await port.open(defaultOptions);
}

/**
 * Write data to serial port (for ESC/POS printing)
 */
export async function writeToSerialPort(
  port: SerialPort,
  data: Uint8Array,
): Promise<void> {
  const writer = port.writable?.getWriter();
  if (!writer) {
    throw new Error("Port is not writable");
  }

  try {
    await writer.write(data);
  } finally {
    writer.releaseLock();
  }
}

/**
 * Close serial port connection
 */
export async function closeSerialPort(port: SerialPort): Promise<void> {
  if (port.readable || port.writable) {
    await port.close();
  }
}

/**
 * Request access to Bluetooth printer using Web Bluetooth API
 */
export async function requestBluetoothPrinter(): Promise<BluetoothDevice | null> {
  if (!isBluetoothAPISupported()) {
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

  try {
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [
        // Serial Port Profile (SPP) - common for Bluetooth printers
        { services: ["00001101-0000-1000-8000-00805f9b34fb"] },
        // Generic printer services
        { namePrefix: "Printer" },
        { namePrefix: "POS" },
        { namePrefix: "Receipt" },
      ],
      optionalServices: [
        "battery_service",
        "device_information",
        "00001101-0000-1000-8000-00805f9b34fb", // Serial Port Profile
      ],
    });

    return device;
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      throw new Error(
        "No Bluetooth printer found. Make sure it is in pairing mode.",
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

/**
 * Connect to Bluetooth printer and get GATT service
 */
export async function connectBluetoothPrinter(
  device: BluetoothDevice,
): Promise<BluetoothRemoteGATTCharacteristic | null> {
  if (!device.gatt) {
    throw new Error("Device does not support GATT");
  }

  try {
    const server = await device.gatt.connect();

    // Try to get Serial Port Profile service
    const service = await server.getPrimaryService(
      "00001101-0000-1000-8000-00805f9b34fb",
    );

    // Get characteristic for writing data
    const characteristics = await service.getCharacteristics();
    const writeCharacteristic = characteristics.find(
      (char) => char.properties.write || char.properties.writeWithoutResponse,
    );

    return writeCharacteristic || null;
  } catch (error) {
    console.warn("Failed to connect to Bluetooth printer:", error);
    throw new Error(
      "Failed to connect to Bluetooth printer. Make sure it supports Serial Port Profile.",
    );
  }
}

/**
 * Write data to Bluetooth printer
 */
export async function writeToBluetoothPrinter(
  characteristic: BluetoothRemoteGATTCharacteristic,
  data: Uint8Array,
): Promise<void> {
  // Create a new Uint8Array view to ensure we have a proper BufferSource
  const buffer = new Uint8Array(data);

  if (characteristic.properties.writeWithoutResponse) {
    await characteristic.writeValueWithoutResponse(buffer);
  } else if (characteristic.properties.write) {
    await characteristic.writeValue(buffer);
  } else {
    throw new Error("Characteristic does not support writing");
  }
}

/**
 * Register a printer device in the backend
 */
export async function registerPrinterDevice(
  printer: RegisterPrinterInput,
): Promise<PrinterDevice> {
  const accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const response = await axios.post(
    `${API_URL}/api/v1/devices/register`,
    {
      identifier: printer.identifier,
      name: printer.name,
      type: printer.type,
      hardwareId: printer.hardwareId || printer.identifier,
      vendorId: printer.vendorId,
      productId: printer.productId,
      locationId: printer.locationId,
      metadata: {
        ...printer.metadata,
        connectionType: printer.connectionType,
        config: printer.config,
        deviceType: "printer",
      },
      isActive: true,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const deviceData = response.data;
  return {
    id: deviceData.id,
    name: deviceData.name,
    type: printer.type,
    connectionType: printer.connectionType,
    config: printer.config,
    isConnected: false,
    locationId: deviceData.locationId,
    registeredById: deviceData.registeredById,
    lastUsedAt: deviceData.lastUsedAt
      ? new Date(deviceData.lastUsedAt)
      : undefined,
    metadata: deviceData.metadata,
  };
}

/**
 * List registered printer devices
 */
export async function listPrinterDevices(
  locationId?: string,
): Promise<PrinterDevice[]> {
  const accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const params = locationId ? { location_id: locationId } : {};
  const response = await axios.get(`${API_URL}/api/v1/devices`, {
    params,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // Filter for printer devices
  return response.data
    .filter((device: any) => device.metadata?.deviceType === "printer")
    .map((device: any) => ({
      id: device.id,
      name: device.name,
      type: device.type,
      connectionType: device.metadata?.connectionType || "websocket",
      config: device.metadata?.config,
      isConnected: false,
      locationId: device.locationId,
      registeredById: device.registeredById,
      lastUsedAt: device.lastUsedAt ? new Date(device.lastUsedAt) : undefined,
      metadata: device.metadata,
    }));
}

/**
 * Update printer device
 */
export async function updatePrinterDevice(
  deviceId: string,
  updates: Partial<RegisterPrinterInput>,
): Promise<PrinterDevice> {
  const accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const updatePayload: any = {};
  if (updates.name !== undefined) updatePayload.name = updates.name;
  if (updates.config !== undefined) {
    updatePayload.metadata = { config: updates.config };
  }
  if (updates.locationId !== undefined)
    updatePayload.locationId = updates.locationId;

  const response = await axios.patch(
    `${API_URL}/api/v1/devices/${deviceId}`,
    updatePayload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const deviceData = response.data;
  return {
    id: deviceData.id,
    name: deviceData.name,
    type: deviceData.type,
    connectionType: deviceData.metadata?.connectionType || "websocket",
    config: deviceData.metadata?.config,
    isConnected: false,
    locationId: deviceData.locationId,
    registeredById: deviceData.registeredById,
    lastUsedAt: deviceData.lastUsedAt
      ? new Date(deviceData.lastUsedAt)
      : undefined,
    metadata: deviceData.metadata,
  };
}

/**
 * Get available serial ports (already granted permission)
 */
export async function getAvailableSerialPorts(): Promise<SerialPort[]> {
  if (!isSerialAPISupported()) {
    return [];
  }

  try {
    const ports = await (navigator as any).serial.getPorts();
    return ports;
  } catch (error) {
    console.warn("Failed to get serial ports:", error);
    return [];
  }
}

/**
 * Get printer device info from serial port
 */
export async function getSerialPortInfo(port: SerialPort): Promise<{
  vendorId?: string;
  productId?: string;
  deviceName?: string;
}> {
  const info = (port as any).getInfo?.();
  if (!info) {
    return {
      deviceName: "USB Serial Printer",
    };
  }

  return {
    vendorId: info.usbVendorId?.toString(16).padStart(4, "0"),
    productId: info.usbProductId?.toString(16).padStart(4, "0"),
    deviceName: info.usbProductName || "USB Serial Printer",
  };
}
