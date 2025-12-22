/// <reference types="vite/client" />
/// <reference types="@capacitor-community/barcode-scanner" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WINDOWS_INSTALLER_URL?: string;
  readonly VITE_ANDROID_APK_URL?: string;
  readonly VITE_MACOS_INSTALLER_URL?: string;
  readonly VITE_IOS_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    posApp?: {
      getInfo: () => Promise<{ name: string; version: string }>;
      listNativeDevices: () => Promise<
        import("./types/nativeDevices").NativeDeviceSummary[]
      >;
      scanBluetoothDevices: (
        timeoutMs?: number,
      ) => Promise<import("./types/nativeDevices").NativeDeviceSummary[]>;
      onNativeDevicesUpdated: (
        callback: (
          devices: import("./types/nativeDevices").NativeDeviceSummary[],
        ) => void,
      ) => () => void;
    };
    __IS_ELECTRON__?: boolean;
  }
}

export {};
