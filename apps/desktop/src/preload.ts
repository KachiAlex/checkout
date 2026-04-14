import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

type NativeDeviceSummary = import("./native/deviceManager").NativeDeviceSummary;

const NATIVE_DEVICE_UPDATE_CHANNEL = "native-devices:updated";
const LICENSE_STATUS_CHANNEL = "license:status-changed";
const BACKEND_STATUS_CHANNEL = "desktop-backend:status";

contextBridge.exposeInMainWorld("__IS_ELECTRON__", true as const);

contextBridge.exposeInMainWorld("posApp", {
  getInfo: async () => ipcRenderer.invoke("app:get-info"),
  listNativeDevices: async (): Promise<NativeDeviceSummary[]> =>
    ipcRenderer.invoke("native-devices:list"),
  scanBluetoothDevices: async (
    timeoutMs?: number,
  ): Promise<NativeDeviceSummary[]> =>
    ipcRenderer.invoke("native-devices:scan", timeoutMs),
  onNativeDevicesUpdated: (
    callback: (devices: NativeDeviceSummary[]) => void,
  ) => {
    const listener = (
      _event: IpcRendererEvent,
      devices: NativeDeviceSummary[],
    ) => callback(devices);
    ipcRenderer.on(NATIVE_DEVICE_UPDATE_CHANNEL, listener);
    return () => {
      ipcRenderer.removeListener(NATIVE_DEVICE_UPDATE_CHANNEL, listener);
    };
  },
  // Router navigation from menu
  onNavigate: (callback: (route: string) => void) => {
    const listener = (_event: IpcRendererEvent, route: string) => {
      callback(route);
    };
    ipcRenderer.on("router:navigate", listener);
    return () => {
      ipcRenderer.removeListener("router:navigate", listener);
    };
  },
});

// Expose licensing API
contextBridge.exposeInMainWorld("licensing", {
  validate: async () => ipcRenderer.invoke("license:validate"),
  getInfo: async () => ipcRenderer.invoke("license:getInfo"),
  getStatus: async () => ipcRenderer.invoke("license:getStatus"),
  activate: async (payload: {
    licenseKey: string;
    desktopKey: string;
    deviceName?: string;
    tenantSlug?: string;
  }) => ipcRenderer.invoke("license:activate", payload),
  validateOnline: async (payload: {
    desktopKey: string;
    deviceName?: string;
    tenantSlug?: string;
  }) => ipcRenderer.invoke("license:validateOnline", payload),
  sync: async () => ipcRenderer.invoke("license:sync"),
  needsSync: async () => ipcRenderer.invoke("license:needsSync"),
  isExpiringSoon: async () => ipcRenderer.invoke("license:isExpiringSoon"),
  clear: async () => ipcRenderer.invoke("license:clear"),
  daysUntilExpiry: async () => ipcRenderer.invoke("license:daysUntilExpiry"),
  onStatusChanged: (callback: (status: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, status: unknown) => callback(status);
    ipcRenderer.on(LICENSE_STATUS_CHANNEL, listener);
    return () => {
      ipcRenderer.removeListener(LICENSE_STATUS_CHANNEL, listener);
    };
  },
  getBackendStatus: async () => ipcRenderer.invoke("desktop-backend:getStatus"),
  onBackendStatusChanged: (callback: (status: unknown) => void) => {
    const listener = (_event: IpcRendererEvent, status: unknown) => callback(status);
    ipcRenderer.on(BACKEND_STATUS_CHANNEL, listener);
    return () => {
      ipcRenderer.removeListener(BACKEND_STATUS_CHANNEL, listener);
    };
  },
});

export {};
