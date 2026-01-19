import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

type NativeDeviceSummary = import("./native/deviceManager").NativeDeviceSummary;

const NATIVE_DEVICE_UPDATE_CHANNEL = "native-devices:updated";

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
});

export {};
