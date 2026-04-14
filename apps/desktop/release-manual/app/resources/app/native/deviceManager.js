"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceManager = exports.DeviceManager = void 0;
const events_1 = require("events");
function loadOptionalModule(moduleName) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(moduleName);
    }
    catch (error) {
        console.warn(`[DeviceManager] Optional dependency "${moduleName}" unavailable`, error);
        return null;
    }
}
const HID = loadOptionalModule("node-hid");
const usbDetect = loadOptionalModule("usb-detection");
const USB_EVENTS = [
    "add",
    "remove",
    "change",
];
function resolveDeviceType(device) {
    const transport = device.transport?.toUpperCase?.() ?? "";
    if (transport === "BLUETOOTH") {
        return "bluetooth";
    }
    if (typeof device.vendorId === "number" &&
        typeof device.productId === "number") {
        return "usb";
    }
    return "unknown";
}
function mapHidDevice(device) {
    return {
        id: device.path ??
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
class DeviceManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.cachedHidDevices = [];
        this.usbHandlers = [];
        this.monitoringUsb = false;
        this.refreshDevices();
        this.startUsbMonitoring();
    }
    updateCache() {
        if (!HID?.devices) {
            console.warn("[DeviceManager] node-hid not available; skipping HID enumeration");
            this.cachedHidDevices = [];
            this.emit("devices-updated", []);
            return;
        }
        try {
            const devices = HID.devices().map((device) => mapHidDevice(device));
            this.cachedHidDevices = devices;
            this.emit("devices-updated", devices);
        }
        catch (error) {
            console.error("[DeviceManager] Failed to enumerate HID devices", error);
        }
    }
    startUsbMonitoring() {
        if (this.monitoringUsb)
            return;
        if (!usbDetect?.startMonitoring) {
            console.warn("[DeviceManager] usb-detection not available; USB hotplug disabled");
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
        }
        catch (error) {
            this.monitoringUsb = false;
            console.warn("[DeviceManager] USB detection unavailable", error);
        }
    }
    stopUsbMonitoring() {
        if (!this.monitoringUsb) {
            return;
        }
        if (!usbDetect?.stopMonitoring) {
            return;
        }
        try {
            const emitter = usbDetect;
            this.usbHandlers.forEach(({ event, handler }) => {
                emitter.removeListener(event, handler);
            });
            this.usbHandlers = [];
            usbDetect.stopMonitoring();
        }
        catch (error) {
            console.warn("[DeviceManager] USB detection stop failed", error);
        }
        finally {
            this.monitoringUsb = false;
        }
    }
    refreshDevices() {
        this.updateCache();
        return this.getConnectedDevices();
    }
    getConnectedDevices() {
        return this.cachedHidDevices.slice();
    }
    async scanBluetoothDevices() {
        const devices = this.refreshDevices();
        return devices.filter((device) => device.type === "bluetooth" ||
            device.transport?.toUpperCase?.() === "BLUETOOTH");
    }
    async dispose() {
        this.stopUsbMonitoring();
        this.removeAllListeners();
    }
}
exports.DeviceManager = DeviceManager;
exports.deviceManager = new DeviceManager();
exports.default = exports.deviceManager;
//# sourceMappingURL=deviceManager.js.map