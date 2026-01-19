import { EventEmitter } from "events";

type HidModule = typeof import("node-hid");
type UsbDetectionModule = typeof import("usb-detection");

function loadOptionalModule<T>(moduleName: string): T | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(moduleName) as T;
  } catch (error) {
    console.warn(
      `[DeviceManager] Optional dependency "${moduleName}" unavailable`,
      error,
    );
    return null;
  }
}

const HID: HidModule | null = loadOptionalModule<HidModule>("node-hid");
const usbDetect: UsbDetectionModule | null =
  loadOptionalModule<UsbDetectionModule>("usb-detection");

export type NativeDeviceType = "usb" | "bluetooth" | "unknown";

export interface NativeDeviceSummary {
  id: string;
  name: string;
  type: NativeDeviceType;
  vendorId?: number;
  productId?: number;
  path?: string;
  manufacturer?: string;
  serialNumber?: string;
  transport?: string;
  isPaired?: boolean;
}

const USB_EVENTS: Array<"add" | "remove" | "change"> = [
  "add",
  "remove",
  "change",
];

type HidDeviceInfo = {
  vendorId?: number;
  productId?: number;
  path?: string;
  product?: string;
  manufacturer?: string;
  serialNumber?: string;
  transport?: string;
};

function resolveDeviceType(device: HidDeviceInfo): NativeDeviceType {
  const transport = device.transport?.toUpperCase?.() ?? "";
  if (transport === "BLUETOOTH") {
    return "bluetooth";
  }
  if (
    typeof device.vendorId === "number" &&
    typeof device.productId === "number"
  ) {
    return "usb";
  }
  return "unknown";
}

function mapHidDevice(device: HidDeviceInfo): NativeDeviceSummary {
  return {
    id:
      device.path ??
      `${device.vendorId ?? "unknown"}:${device.productId ?? "unknown"}`,
    name: device.product ?? device.manufacturer ?? "HID Device",
    type: resolveDeviceType(device),
    vendorId: device.vendorId,
    productId: device.productId,
    path: device.path,
    manufacturer: device.manufacturer,
    serialNumber: device.serialNumber,
    transport: device.transport,
    isPaired: device.transport === "BLUETOOTH" ? true : undefined,
  };
}

export class DeviceManager extends EventEmitter {
  private cachedHidDevices: NativeDeviceSummary[] = [];
  private usbHandlers: Array<{
    event: (typeof USB_EVENTS)[number];
    handler: () => void;
  }> = [];
  private monitoringUsb = false;

  constructor() {
    super();
    this.refreshDevices();
    this.startUsbMonitoring();
  }

  private updateCache() {
    if (!HID?.devices) {
      console.warn(
        "[DeviceManager] node-hid not available; skipping HID enumeration",
      );
      this.cachedHidDevices = [];
      this.emit("devices-updated", []);
      return;
    }

    try {
      const devices = HID.devices().map((device: HidDeviceInfo) =>
        mapHidDevice(device),
      );
      this.cachedHidDevices = devices;
      this.emit("devices-updated", devices);
    } catch (error) {
      console.error("[DeviceManager] Failed to enumerate HID devices", error);
    }
  }

  private startUsbMonitoring() {
    if (this.monitoringUsb) return;

    if (!usbDetect?.startMonitoring) {
      console.warn(
        "[DeviceManager] usb-detection not available; USB hotplug disabled",
      );
      return;
    }

    try {
      usbDetect.startMonitoring();
      this.monitoringUsb = true;

      const refresh = () => this.refreshDevices();

      this.usbHandlers = USB_EVENTS.map((event) => {
        usbDetect.on(event, refresh);
        return { event, handler: refresh };
      });
    } catch (error) {
      this.monitoringUsb = false;
      console.warn("[DeviceManager] USB detection unavailable", error);
    }
  }

  private stopUsbMonitoring() {
    if (!this.monitoringUsb) {
      return;
    }

    if (!usbDetect?.stopMonitoring) {
      return;
    }

    try {
      const emitter = usbDetect as unknown as EventEmitter;
      this.usbHandlers.forEach(({ event, handler }) => {
        emitter.removeListener(event, handler as (...args: unknown[]) => void);
      });
      this.usbHandlers = [];
      usbDetect.stopMonitoring();
    } catch (error) {
      console.warn("[DeviceManager] USB detection stop failed", error);
    } finally {
      this.monitoringUsb = false;
    }
  }

  public refreshDevices(): NativeDeviceSummary[] {
    this.updateCache();
    return this.getConnectedDevices();
  }

  public getConnectedDevices(): NativeDeviceSummary[] {
    return this.cachedHidDevices.slice();
  }

  public async scanBluetoothDevices(): Promise<NativeDeviceSummary[]> {
    const devices = this.refreshDevices();
    return devices.filter(
      (device) =>
        device.type === "bluetooth" ||
        device.transport?.toUpperCase?.() === "BLUETOOTH",
    );
  }

  public async dispose(): Promise<void> {
    this.stopUsbMonitoring();
    this.removeAllListeners();
  }
}

export const deviceManager = new DeviceManager();

export default deviceManager;
