import { app, BrowserWindow, shell, ipcMain, dialog, protocol, session } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import deviceManager, { NativeDeviceSummary } from './native/deviceManager';

// Single instance
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.commandLine.appendSwitch('enable-web-bluetooth');
app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', 'file://');

const BLUETOOTH_PERMISSIONS = new Set(['bluetooth', 'bluetooth-scan', 'bluetooth-connect']);

// Intercept file protocol to serve files from asar archive
function setupFileProtocol() {
  // Register custom app:// protocol
  protocol.registerFileProtocol('app', (request, callback) => {
    let url = request.url.substr(6); // Remove 'app://' prefix
    
    // CRITICAL FIX: Handle malformed URLs like app://index.html/assets/...
    // These happen when browser resolves /assets/ relative to app://index.html
    // Rewrite them to app://assets/...
    if (url.includes('index.html/assets/') || url.includes('index.html/')) {
      url = url.replace(/index\.html\//g, '');
      console.log(`[app://] Rewriting malformed URL: ${request.url} -> app://${url}`);
    }
    
    // Handle paths like app://index.html or app://assets/...
    // Remove leading slashes
    while (url.startsWith('/')) {
      url = url.substring(1);
    }
    
    // Remove query strings and fragments
    url = url.split('?')[0].split('#')[0];
    
    let filePath: string;
    
    if (app.isPackaged) {
      // In production, files are in app.asar/frontend-dist
      filePath = path.join(process.resourcesPath, 'app.asar', 'frontend-dist', url);
    } else {
      // In development, files are in frontend-dist
      filePath = path.join(__dirname, '..', 'frontend-dist', url);
    }
    
    // Normalize path separators
    filePath = path.normalize(filePath);
    
    // Check if file exists
    try {
      if (fs.existsSync(filePath)) {
        callback({ path: filePath });
      } else {
        console.error(`[app://] File not found: ${filePath} (requested: ${request.url}, cleaned: ${url})`);
        // Try without the leading path segment if it's an asset
        if (url.startsWith('assets/')) {
          const altPath = path.join(process.resourcesPath, 'app.asar', 'frontend-dist', url);
          if (fs.existsSync(altPath)) {
            console.log(`[app://] Found file at alternative path: ${altPath}`);
            callback({ path: altPath });
            return;
          }
        }
        callback({ error: -6 }); // FILE_NOT_FOUND
      }
    } catch (error) {
      console.error(`[app://] Error accessing file: ${filePath}`, error);
      callback({ error: -6 });
    }
  });
  
  // Also intercept standard file:// protocol for asar files
  protocol.interceptFileProtocol('file', (request, callback) => {
    const fileUrl = request.url;
    
    // Check if this is a request for a file in our app.asar
    if (app.isPackaged && fileUrl.includes('app.asar')) {
      // Extract the path after app.asar
      const asarMatch = fileUrl.match(/app\.asar[\\\/](.+)$/i);
      if (asarMatch) {
        const relativePath = asarMatch[1].replace(/\\/g, '/');
        const filePath = path.join(process.resourcesPath, 'app.asar', relativePath);
        
        try {
          if (fs.existsSync(filePath)) {
            callback({ path: filePath });
            return;
          }
        } catch (error) {
          console.error(`[file://] Error accessing asar file: ${filePath}`, error);
        }
      }
    }
    
    // For non-asar files, use default file protocol behavior
    callback({ path: fileUrl.replace(/^file:\/\//, '') });
  });
}

// Register protocol schemes before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

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
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      experimentalFeatures: true,
    },
    title: 'Checkout POS',
    icon: resolveAppIcon(),
    show: false,
    backgroundColor: '#0f172a', // slate-900 background to match app theme
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  const isDev = process.env.NODE_ENV === 'development';
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (isDev) {
    // In development, load from dev server - routing will handle login redirect
    mainWindow.loadURL(devServerUrl).catch(() => undefined);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, use app:// protocol with proper base tag
    // The base tag in HTML will ensure assets resolve correctly
    mainWindow.loadURL('app://index.html').catch((error) => {
      console.error('Failed to load index.html via app protocol', error);
      // Fallback: try loadFile
      if (mainWindow) {
        const packagedIndexPath = path.join(process.resourcesPath, 'app.asar', 'frontend-dist', 'index.html');
        mainWindow.loadFile(packagedIndexPath).catch((fallbackError) => {
          console.error('Failed to load from file protocol', fallbackError);
        });
      }
    });
  }
  
  // Additional webRequest interceptor as backup (protocol handler should handle it, but this is a safety net)
  if (!isDev && mainWindow) {
    const webSession = mainWindow.webContents.session;
    webSession.webRequest.onBeforeRequest(
      { urls: ['app://*'] },
      (details, callback) => {
        // If request is for assets and includes index.html in path, rewrite it
        if (details.url.includes('index.html/assets/') || details.url.includes('index.html/')) {
          const correctedUrl = details.url.replace(/index\.html\//g, '');
          console.log(`[webRequest] Rewriting URL: ${details.url} -> ${correctedUrl}`);
          callback({ redirectURL: correctedUrl });
        } else {
          callback({});
        }
      }
    );
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
  // Setup protocol handlers after app is ready
  setupFileProtocol();
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


