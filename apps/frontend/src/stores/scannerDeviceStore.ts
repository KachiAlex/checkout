import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ScannerDevice {
  id: string;
  name: string;
  type: "usb" | "bluetooth" | "camera";
  deviceId?: string; // Bluetooth device ID or USB device ID
  vendorId?: string; // USB vendor ID
  productId?: string; // USB product ID
  connectedAt: Date;
  lastUsedAt: Date;
  locationId?: string;
  userId?: string;
  isActive: boolean;
  metadata?: {
    batteryLevel?: number;
    firmwareVersion?: string;
    manufacturer?: string;
    model?: string;
  };
}

interface ScannerDeviceState {
  devices: ScannerDevice[];
  activeDeviceId: string | null;
  addDevice: (
    device: Omit<ScannerDevice, "connectedAt" | "lastUsedAt"> & {
      id?: string;
      connectedAt?: Date | string;
      lastUsedAt?: Date | string;
    },
  ) => string;
  updateDevice: (id: string, updates: Partial<ScannerDevice>) => void;
  removeDevice: (id: string) => void;
  setActiveDevice: (id: string | null) => void;
  getActiveDevice: () => ScannerDevice | null;
  markDeviceUsed: (id: string) => void;
}

export const useScannerDeviceStore = create<ScannerDeviceState>()(
  persist(
    (set, get) => ({
      devices: [],
      activeDeviceId: null,

      addDevice: (device) => {
        const id =
          device.id ??
          `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const connectedAt = device.connectedAt
          ? new Date(device.connectedAt)
          : new Date();
        const lastUsedAt = device.lastUsedAt
          ? new Date(device.lastUsedAt)
          : new Date();

        const newDevice: ScannerDevice = {
          ...device,
          id,
          connectedAt,
          lastUsedAt,
        };

        set((state) => {
          const existing = state.devices.find((d) => d.id === id);
          if (existing) {
            return {
              devices: state.devices.map((d) =>
                d.id === id ? { ...existing, ...newDevice } : d,
              ),
              activeDeviceId: state.activeDeviceId || id,
            };
          }

          return {
            devices: [...state.devices, newDevice],
            activeDeviceId: state.activeDeviceId || id,
          };
        });

        return id;
      },

      updateDevice: (id, updates) => {
        set((state) => ({
          devices: state.devices.map((device) =>
            device.id === id
              ? {
                  ...device,
                  ...updates,
                  connectedAt: updates.connectedAt
                    ? new Date(updates.connectedAt as Date | string)
                    : device.connectedAt,
                  lastUsedAt: updates.lastUsedAt
                    ? new Date(updates.lastUsedAt as Date | string)
                    : device.lastUsedAt,
                }
              : device,
          ),
        }));
      },

      removeDevice: (id) => {
        set((state) => {
          const newDevices = state.devices.filter((device) => device.id !== id);
          return {
            devices: newDevices,
            activeDeviceId:
              state.activeDeviceId === id ? null : state.activeDeviceId,
          };
        });
      },

      setActiveDevice: (id) => {
        set((state) => {
          // Deactivate all devices
          const updatedDevices = state.devices.map((device) => ({
            ...device,
            isActive: device.id === id,
          }));

          return {
            devices: updatedDevices,
            activeDeviceId: id,
          };
        });
      },

      getActiveDevice: () => {
        const state = get();
        if (!state.activeDeviceId) return null;
        return (
          state.devices.find((device) => device.id === state.activeDeviceId) ||
          null
        );
      },

      markDeviceUsed: (id) => {
        set((state) => ({
          devices: state.devices.map((device) =>
            device.id === id
              ? { ...device, lastUsedAt: new Date(), isActive: true }
              : device,
          ),
        }));
      },
    }),
    {
      name: "scanner-devices-storage",
      // Custom serialization for Date objects
      partialize: (state) => ({
        devices: state.devices.map((device) => ({
          ...device,
          connectedAt: device.connectedAt.toISOString(),
          lastUsedAt: device.lastUsedAt.toISOString(),
        })),
        activeDeviceId: state.activeDeviceId,
      }),
      // Custom deserialization for Date objects
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.devices = state.devices.map((device) => ({
            ...device,
            connectedAt: new Date(device.connectedAt),
            lastUsedAt: new Date(device.lastUsedAt),
          }));
        }
      },
    },
  ),
);
