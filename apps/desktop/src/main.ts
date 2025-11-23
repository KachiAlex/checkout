import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import deviceManager, { NativeDeviceSummary } from './native/deviceManager';

// Single instance
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.commandLine.appendSwitch('enable-web-bluetooth');
app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', 'file://');

const BLUETOOTH_PERMISSIONS = new Set(['bluetooth', 'bluetooth-scan', 'bluetooth-connect']);

let mainWindow: BrowserWindow | null = null;

function resolveAppIcon(): string | undefined {
  try {
    if (app.isPackaged) {
      const packagedIcon = path.join(process.resourcesPath, process.platform === 'win32' ? 'icon.ico' : 'icon.png');
      return packagedIcon;
    }
    return path.join(__dirname, '../build/icon.png');
  } catch (error) {
    console.warn('[App] Unable to resolve application icon', error);
    return undefined;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      experimentalFeatures: true,
    },
    title: 'POS Checkout',
    icon: resolveAppIcon(),
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  const isDev = process.env.NODE_ENV === 'development';
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (isDev) {
    mainWindow.loadURL(devServerUrl).catch(() => undefined);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '../../frontend-dist/index.html');
    mainWindow.loadFile(indexPath).catch((error) => {
      console.error('Failed to load index.html', error);
    });
  }

  const webSession = mainWindow.webContents.session;

  webSession.setPermissionCheckHandler((_, permission) => {
    const permissionName = permission as unknown as string;
    return BLUETOOTH_PERMISSIONS.has(permissionName);
  });

  webSession.setPermissionRequestHandler((_, permission, callback) => {
    const permissionName = permission as unknown as string;
    if (BLUETOOTH_PERMISSIONS.has(permissionName)) {
      callback(true);
      return;
    }

    callback(false);
  });

  mainWindow.webContents.on('select-bluetooth-device', (event, devices, callback) => {
    event.preventDefault();

    if (!devices || devices.length === 0) {
      callback('');
      return;
    }

    const preferred = devices.find((device) => device.deviceName?.toLowerCase().includes('scanner')) ?? devices[0];
    callback(preferred.deviceId);
  });

  const forwardDevices = (devices: NativeDeviceSummary[]) => {
    if (!mainWindow || mainWindow.webContents.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send('native-devices:updated', devices);
  };

  deviceManager.on('devices-updated', forwardDevices);
  forwardDevices(deviceManager.getConnectedDevices());

  // External links open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    deviceManager.removeListener('devices-updated', forwardDevices);
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  ipcMain.handle('app:get-info', () => ({
    name: app.getName(),
    version: app.getVersion(),
  }));

  ipcMain.handle('native-devices:list', (): NativeDeviceSummary[] => deviceManager.refreshDevices());

  ipcMain.handle('native-devices:scan', async (_event, timeoutMs?: number): Promise<NativeDeviceSummary[]> => {
    if (timeoutMs && timeoutMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(timeoutMs, 2000)));
    }

    return deviceManager.scanBluetoothDevices();
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    await deviceManager.dispose();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Ensure native resources are cleaned up
app.on('before-quit', async () => {
  await deviceManager.dispose();
});

// Manual update check
ipcMain.handle('app:check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Download update
ipcMain.handle('app:download-update', () => {
  autoUpdater.downloadUpdate();
  return { success: true };
});

// Install update
ipcMain.handle('app:install-update', () => {
  autoUpdater.quitAndInstall(false, true);
  return { success: true };
});


