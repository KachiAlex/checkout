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
      // First try without requesting Web USB access (for HID keyboard scanners)
      let device;
      try {
        device = await registerUSBDevice(user?.locationId, user?.id, false);
      } catch (error) {
        // If that fails, try requesting Web USB access
        device = await registerUSBDevice(user?.locationId, user?.id, true);
      }
      
      const deviceId = addDevice(device);
      setActiveDevice(deviceId);
      toast.success(`Registered ${device.name}. USB scanners work automatically - just plug in and scan!`);
    } catch (error: any) {
      // Even if registration fails, USB HID scanners still work as keyboards
      const message = error?.message || 'USB scanner registration note';
      toast.error(`${message}. Most USB scanners work automatically - just plug in and scan!`, { duration: 5000 });
      console.log('USB registration note:', error);
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

      {/* Scanner Information */}
      <div className="mt-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
        <h4 className="theme-text-primary mb-2 text-sm font-semibold text-sky-400">📋 How Scanners Work</h4>
        <div className="space-y-2 text-xs theme-text-secondary">
          <p>
            <strong className="theme-text-primary">USB Scanners:</strong> Most USB barcode scanners work automatically as keyboards. 
            Just plug in your scanner and start scanning - no setup needed! The scanner will type barcodes into the input field.
          </p>
          <p>
            <strong className="theme-text-primary">Bluetooth Scanners:</strong> Click "Pair Bluetooth" to connect wireless scanners. 
            Requires Chrome/Edge browser and HTTPS or localhost.
          </p>
          <p>
            <strong className="theme-text-primary">Camera Scanner:</strong> Use the camera button to scan QR codes and barcodes with your device camera.
          </p>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="theme-surface mt-6 rounded-2xl border border-dashed p-8 text-center">
          <div className="text-4xl mb-4">🔌</div>
          <p className="theme-text-primary text-lg font-semibold mb-2">No Scanners Registered Yet</p>
          <p className="theme-text-secondary text-sm mb-4">
            USB scanners work automatically - just plug in and scan! Registration is optional for tracking purposes.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <button
              onClick={handleRegisterUsb}
              disabled={isRegisteringUsb}
              className="theme-chip rounded-full border border-sky-400/40 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/25 disabled:opacity-50"
            >
              {isRegisteringUsb ? 'Registering...' : '🔌 Register USB Scanner'}
            </button>
            <button
              onClick={handlePairBluetooth}
              disabled={isPairingBluetooth}
              className="theme-chip rounded-full border border-purple-400/40 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-200 transition hover:bg-purple-500/25 disabled:opacity-50"
            >
              {isPairingBluetooth ? 'Pairing...' : '📡 Pair Bluetooth Scanner'}
            </button>
          </div>
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

