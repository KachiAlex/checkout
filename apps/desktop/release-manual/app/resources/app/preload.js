"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const NATIVE_DEVICE_UPDATE_CHANNEL = "native-devices:updated";
electron_1.contextBridge.exposeInMainWorld("__IS_ELECTRON__", true);
electron_1.contextBridge.exposeInMainWorld("posApp", {
    getInfo: async () => electron_1.ipcRenderer.invoke("app:get-info"),
    listNativeDevices: async () => electron_1.ipcRenderer.invoke("native-devices:list"),
    scanBluetoothDevices: async (timeoutMs) => electron_1.ipcRenderer.invoke("native-devices:scan", timeoutMs),
    onNativeDevicesUpdated: (callback) => {
        const listener = (_event, devices) => callback(devices);
        electron_1.ipcRenderer.on(NATIVE_DEVICE_UPDATE_CHANNEL, listener);
        return () => {
            electron_1.ipcRenderer.removeListener(NATIVE_DEVICE_UPDATE_CHANNEL, listener);
        };
    },
});
// Expose licensing API
electron_1.contextBridge.exposeInMainWorld("licensing", {
    validate: async () => electron_1.ipcRenderer.invoke("license:validate"),
    getInfo: async () => electron_1.ipcRenderer.invoke("license:getInfo"),
    activate: async (licenseKey, desktopKey) => electron_1.ipcRenderer.invoke("license:activate", licenseKey, desktopKey),
    validateOnline: async (desktopKey, deviceName) => electron_1.ipcRenderer.invoke("license:validateOnline", desktopKey, deviceName),
    sync: async () => electron_1.ipcRenderer.invoke("license:sync"),
    needsSync: async () => electron_1.ipcRenderer.invoke("license:needsSync"),
    isExpiringSoon: async () => electron_1.ipcRenderer.invoke("license:isExpiringSoon"),
    clear: async () => electron_1.ipcRenderer.invoke("license:clear"),
    daysUntilExpiry: async () => electron_1.ipcRenderer.invoke("license:daysUntilExpiry"),
});
//# sourceMappingURL=preload.js.map