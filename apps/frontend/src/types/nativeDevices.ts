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
