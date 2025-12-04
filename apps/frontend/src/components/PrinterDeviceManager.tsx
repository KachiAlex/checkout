import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  PrinterDevice,
  isSerialAPISupported,
  isBluetoothAPISupported,
  requestSerialPrinter,
  requestBluetoothPrinter,
  connectSerialPort,
  connectBluetoothPrinter,
  registerPrinterDevice,
  listPrinterDevices,
  updatePrinterDevice,
  getSerialPortInfo,
  getAvailableSerialPorts,
  closeSerialPort,
} from '../services/printerDeviceService';
import { receiptService } from '../services/receiptService';
import toast from 'react-hot-toast';

interface PrinterDeviceManagerProps {
  onClose?: () => void;
}

export function PrinterDeviceManager({ onClose }: PrinterDeviceManagerProps) {
  const { user, accessToken } = useAuthStore();
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [availablePorts, setAvailablePorts] = useState<SerialPort[]>([]);

  useEffect(() => {
    if (accessToken) {
      loadPrinters();
      loadAvailablePorts();
    }
  }, [accessToken]);

  const loadPrinters = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const devices = await listPrinterDevices(user?.locationId);
      setPrinters(devices);
    } catch (error: any) {
      console.error('Failed to load printers:', error);
      toast.error('Failed to load printers');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePorts = async () => {
    if (isSerialAPISupported()) {
      try {
        const ports = await getAvailableSerialPorts();
        setAvailablePorts(ports);
      } catch (error) {
        console.warn('Failed to load serial ports:', error);
      }
    }
  };

  const handleConnectUSB = async () => {
    if (!isSerialAPISupported()) {
      toast.error('Web Serial API not supported. Use Chrome/Edge on desktop.');
      return;
    }

    setConnecting('usb');
    try {
      // Request port access
      const port = await requestSerialPrinter();
      
      if (!port) {
        throw new Error('No port selected');
      }
      
      // Get port info
      const portInfo = await getSerialPortInfo(port);
      
      // Connect with default settings (can be customized)
      await connectSerialPort(port, {
        baudRate: 9600, // Common for ESC/POS printers
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
      });

      // Register device
      const identifier = portInfo.vendorId && portInfo.productId
        ? `usb_${portInfo.vendorId}_${portInfo.productId}`
        : `usb_serial_${Date.now()}`;

      const printer = await registerPrinterDevice({
        identifier,
        name: portInfo.deviceName || 'USB Serial Printer',
        type: 'usb',
        connectionType: 'serial',
        hardwareId: identifier,
        vendorId: portInfo.vendorId,
        productId: portInfo.productId,
        locationId: user?.locationId,
        config: {
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
        },
        metadata: {
          portInfo: portInfo,
        },
      });

      // Store port reference (in a real app, you'd use a store/context)
      (printer as any).port = port;

      setPrinters([...printers, printer]);
      toast.success(`Connected to ${printer.name}`);
    } catch (error: any) {
      console.error('Failed to connect USB printer:', error);
      toast.error(error.message || 'Failed to connect USB printer');
    } finally {
      setConnecting(null);
    }
  };

  const handleConnectBluetooth = async () => {
    if (!isBluetoothAPISupported()) {
      toast.error('Web Bluetooth API not supported. Use Chrome/Edge on desktop or Android.');
      return;
    }

    setConnecting('bluetooth');
    try {
      // Request Bluetooth device
      const device = await requestBluetoothPrinter();
      
      if (!device) {
        throw new Error('No Bluetooth device selected');
      }
      
      // Connect to device
      const characteristic = await connectBluetoothPrinter(device);
      
      if (!characteristic) {
        throw new Error('Failed to get write characteristic');
      }

      // Register device
      const identifier = device.id || `bluetooth_${Date.now()}`;
      const printer = await registerPrinterDevice({
        identifier,
        name: device.name || 'Bluetooth Printer',
        type: 'bluetooth',
        connectionType: 'bluetooth',
        hardwareId: device.id,
        locationId: user?.locationId,
        metadata: {
          deviceId: device.id,
        },
      });

      // Store device and characteristic references
      (printer as any).bluetoothDevice = device;
      (printer as any).characteristic = characteristic;

      setPrinters([...printers, printer]);
      toast.success(`Connected to ${printer.name}`);
    } catch (error: any) {
      console.error('Failed to connect Bluetooth printer:', error);
      toast.error(error.message || 'Failed to connect Bluetooth printer');
    } finally {
      setConnecting(null);
    }
  };

  const handleTestPrint = async (printer: PrinterDevice) => {
    if (!accessToken) {
      toast.error('Not authenticated');
      return;
    }

    setTesting(printer.id);
    try {
      // Create a test order ID (in real app, you'd use an actual order)
      const testOrderId = 'test-print';
      
      if (printer.connectionType === 'serial' && printer.port) {
        await receiptService.printReceiptToSerial(testOrderId, printer.port);
      } else if (printer.connectionType === 'bluetooth' && (printer as any).characteristic) {
        await receiptService.printReceiptToBluetooth(testOrderId, (printer as any).characteristic);
      } else {
        toast.error('Printer not connected');
        return;
      }

      toast.success('Test print sent successfully');
    } catch (error: any) {
      console.error('Test print failed:', error);
      toast.error(error.message || 'Test print failed');
    } finally {
      setTesting(null);
    }
  };

  const handleDisconnect = async (printer: PrinterDevice) => {
    try {
      if (printer.port) {
        await closeSerialPort(printer.port);
      }
      if ((printer as any).bluetoothDevice?.gatt) {
        (printer as any).bluetoothDevice.gatt.disconnect();
      }

      setPrinters(printers.filter(p => p.id !== printer.id));
      toast.success('Printer disconnected');
    } catch (error: any) {
      console.error('Failed to disconnect printer:', error);
      toast.error('Failed to disconnect printer');
    }
  };

  return (
    <div className="theme-surface rounded-2xl border theme-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold theme-text-primary">Printer Devices</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="theme-chip rounded-full border p-2 transition hover:bg-white/10"
          >
            ✕
          </button>
        )}
      </div>

      {/* Connection Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={handleConnectUSB}
          disabled={connecting !== null || !isSerialAPISupported()}
          className="theme-surface rounded-xl border theme-border p-4 hover:border-sky-400/50 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔌</span>
            <div className="text-left">
              <p className="font-semibold theme-text-primary">USB Printer</p>
              <p className="text-xs theme-text-secondary">
                {connecting === 'usb' ? 'Connecting...' : isSerialAPISupported() ? 'Connect via USB Serial' : 'Not supported'}
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={handleConnectBluetooth}
          disabled={connecting !== null || !isBluetoothAPISupported()}
          className="theme-surface rounded-xl border theme-border p-4 hover:border-sky-400/50 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📶</span>
            <div className="text-left">
              <p className="font-semibold theme-text-primary">Bluetooth Printer</p>
              <p className="text-xs theme-text-secondary">
                {connecting === 'bluetooth' ? 'Connecting...' : isBluetoothAPISupported() ? 'Connect via Bluetooth' : 'Not supported'}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Connected Printers */}
      <div>
        <h3 className="text-lg font-semibold theme-text-primary mb-4">Connected Printers</h3>
        {loading ? (
          <p className="theme-text-secondary text-sm">Loading printers...</p>
        ) : printers.length === 0 ? (
          <div className="theme-surface rounded-xl border border-dashed theme-border p-8 text-center">
            <p className="theme-text-secondary text-sm">No printers connected</p>
            <p className="theme-text-secondary text-xs mt-2">
              Connect a USB or Bluetooth printer to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {printers.map((printer) => (
              <div
                key={printer.id}
                className="theme-surface rounded-xl border theme-border p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold theme-text-primary">{printer.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        printer.type === 'usb' ? 'bg-blue-500/20 text-blue-400' :
                        printer.type === 'bluetooth' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {printer.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm theme-text-secondary space-y-1">
                      <p>Connection: {printer.connectionType}</p>
                      {printer.config?.baudRate && (
                        <p>Baud Rate: {printer.config.baudRate}</p>
                      )}
                      {printer.lastUsedAt && (
                        <p>Last Used: {new Date(printer.lastUsedAt).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTestPrint(printer)}
                      disabled={testing === printer.id}
                      className="px-4 py-2 rounded-lg bg-sky-500/20 text-sky-400 text-sm font-medium hover:bg-sky-500/30 transition disabled:opacity-50 touch-manipulation"
                    >
                      {testing === printer.id ? 'Printing...' : 'Test Print'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(printer)}
                      className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition touch-manipulation"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="theme-surface rounded-xl border theme-border p-4">
        <h4 className="font-semibold theme-text-primary mb-2">About Printer Connections</h4>
        <ul className="text-sm theme-text-secondary space-y-1 list-disc list-inside">
          <li>USB printers: Requires Chrome/Edge browser with Web Serial API support</li>
          <li>Bluetooth printers: Requires HTTPS or localhost, Chrome/Edge on desktop or Android</li>
          <li>Most USB scanners work automatically as keyboards - no setup needed</li>
          <li>Printers are registered per location and can be used by all staff</li>
        </ul>
      </div>
    </div>
  );
}

