import { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useScannerDeviceStore, ScannerDevice } from '../stores/scannerDeviceStore';
import { useAuthStore } from '../stores/authStore';
import {
  fetchRegisteredDevices,
  registerUSBDevice,
  registerBluetoothDevice,
} from '../services/scannerDeviceService';
import { connectBluetoothScanner } from '../services/scannerService';

export function ScannerDeviceList() {
  const { user } = useAuthStore();
  const { devices, removeDevice, setActiveDevice, activeDeviceId, addDevice } = useScannerDeviceStore();
  const [isRegisteringUsb, setIsRegisteringUsb] = useState(false);
  const [isPairingBluetooth, setIsPairingBluetooth] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadDevices = async () => {
      try {
        const response = await fetchRegisteredDevices(user?.locationId);
        if (!isMounted) return;

        response.forEach((device) => {
          addDevice(device);
        });

        if (!activeDeviceId && response.length > 0) {
          setActiveDevice(response[0].id);
        }
      } catch (error) {
        console.warn('Failed to load registered devices', error);
        toast.error('Unable to load registered scanners');
      }
    };

    loadDevices();

    return () => {
      isMounted = false;
    };
  }, [addDevice, activeDeviceId, setActiveDevice, user?.locationId]);

  const handleRegisterUsb = useCallback(async () => {
    if (isRegisteringUsb) return;
    setIsRegisteringUsb(true);

    try {
      const device = await registerUSBDevice(user?.locationId, user?.id);
      const deviceId = addDevice(device);
      setActiveDevice(deviceId);
      toast.success(`Registered ${device.name}`);
    } catch (error: any) {
      const message = error?.message || 'Unable to register USB scanner';
      toast.error(message);
      console.warn('USB registration failed', error);
    } finally {
      setIsRegisteringUsb(false);
    }
  }, [addDevice, setActiveDevice, user?.id, user?.locationId, isRegisteringUsb]);

  const handlePairBluetooth = useCallback(async () => {
    if (isPairingBluetooth) return;
    setIsPairingBluetooth(true);

    try {
      const bluetoothDevice = await connectBluetoothScanner();
      if (!bluetoothDevice) {
        toast.error('No Bluetooth device selected');
        return;
      }

      const registered = await registerBluetoothDevice(
        bluetoothDevice,
        user?.locationId,
        user?.id,
      );
      const deviceId = addDevice(registered);
      setActiveDevice(deviceId);
      toast.success(`Paired ${registered.name}`);
    } catch (error: any) {
      const message = error?.message || 'Unable to pair Bluetooth scanner';
      toast.error(message);
      console.warn('Bluetooth pairing failed', error);
    } finally {
      setIsPairingBluetooth(false);
    }
  }, [addDevice, setActiveDevice, user?.id, user?.locationId, isPairingBluetooth]);

  const getDeviceTypeIcon = (type: ScannerDevice['type']) => {
    switch (type) {
      case 'usb':
        return '🔌';
      case 'bluetooth':
        return '📡';
      case 'camera':
        return '📷';
      default:
        return '📱';
    }
  };

  const getDeviceTypeLabel = (type: ScannerDevice['type']) => {
    switch (type) {
      case 'usb':
        return 'USB';
      case 'bluetooth':
        return 'Bluetooth';
      case 'camera':
        return 'Camera';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="theme-card rounded-3xl border p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="theme-text-primary text-lg font-semibold">Registered scanners</h3>
          <p className="theme-text-secondary text-sm">
            Devices automatically register the first time they scan or pair with this checkout.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRegisterUsb}
            disabled={isRegisteringUsb}
            className="theme-chip inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>🔌</span>
            {isRegisteringUsb ? 'Registering USB…' : 'Register USB'}
          </button>
          <button
            onClick={handlePairBluetooth}
            disabled={isPairingBluetooth}
            className="theme-chip inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>📡</span>
            {isPairingBluetooth ? 'Pairing…' : 'Pair Bluetooth'}
          </button>
          <span className="theme-chip inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-medium">
            <span className="text-base">🛰️</span>
            {devices.length} device{devices.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="theme-surface mt-6 rounded-2xl border border-dashed p-8 text-center">
          <p className="theme-text-secondary text-sm">
            No scanners registered yet. Pair a Bluetooth device or connect a USB scanner to see it here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className={`theme-surface rounded-2xl border p-4 transition ${
                device.id === activeDeviceId
                  ? 'border-sky-400/60 shadow-[0_20px_45px_-30px_rgba(56,189,248,0.4)]'
                  : 'hover:border-white/25'
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-1 gap-3">
                  <div className="theme-chip flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl">
                    {getDeviceTypeIcon(device.type)}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <h4 className="theme-text-primary text-sm font-semibold">{device.name}</h4>
                      <p className="theme-text-secondary text-xs">
                        {getDeviceTypeLabel(device.type)}
                        {device.id === activeDeviceId && (
                          <span className="ml-2 inline-flex items-center rounded-full border border-sky-400/60 bg-sky-500/20 px-2 py-0.5 text-[0.65rem] font-semibold text-sky-100">
                            Active
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="grid gap-2 text-xs theme-text-secondary sm:grid-cols-2">
                      <div>
                        <span className="theme-text-primary font-semibold">Connected</span>
                        <p>{format(device.connectedAt, 'MMM d, yyyy HH:mm')}</p>
                      </div>
                      <div>
                        <span className="theme-text-primary font-semibold">Last used</span>
                        <p>{format(device.lastUsedAt, 'MMM d, yyyy HH:mm')}</p>
                      </div>
                    </div>
                    {device.metadata?.manufacturer && (
                      <p className="theme-text-secondary text-xs">
                        {device.metadata.manufacturer}
                        {device.metadata.model && ` • ${device.metadata.model}`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {device.id !== activeDeviceId && (
                    <button
                      onClick={() => setActiveDevice(device.id)}
                      className="theme-chip rounded-full border px-4 py-1.5 text-xs font-semibold transition hover:border-sky-300/60 hover:bg-sky-400/20 hover:text-white"
                      title="Set as active device"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Remove "${device.name}" from registered devices?`)) {
                        removeDevice(device.id);
                      }
                    }}
                    className="rounded-full border border-rose-400/40 bg-rose-500/15 px-4 py-1.5 text-xs font-semibold text-rose-200 transition hover:border-rose-400/60 hover:bg-rose-500/25 hover:text-rose-100"
                    title="Remove device"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

