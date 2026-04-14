import { EventEmitter } from "events";
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
export declare class DeviceManager extends EventEmitter {
    private cachedHidDevices;
    private usbHandlers;
    private monitoringUsb;
    constructor();
    private updateCache;
    private startUsbMonitoring;
    private stopUsbMonitoring;
    refreshDevices(): NativeDeviceSummary[];
    getConnectedDevices(): NativeDeviceSummary[];
    scanBluetoothDevices(): Promise<NativeDeviceSummary[]>;
    dispose(): Promise<void>;
}
export declare const deviceManager: DeviceManager;
export default deviceManager;
