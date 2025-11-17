import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as url from 'url';

// Single instance
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { status: 'checking' });
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  }
  
  // Show dialog to user
  dialog
    .showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available. Would you like to download it now?`,
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1,
    })
    .then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available. Current version is latest.');
  if (mainWindow) {
    mainWindow.webContents.send('update-status', {
      status: 'not-available',
      version: info.version,
    });
  }
});

autoUpdater.on('error', (err) => {
  console.error('Error in auto-updater:', err);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', {
      status: 'error',
      error: err.message,
    });
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
  console.log(message);
  if (mainWindow) {
    mainWindow.webContents.send('update-progress', {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond,
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('update-status', {
      status: 'downloaded',
      version: info.version,
    });
  }
  
  // Show dialog to restart
  dialog
    .showMessageBox(mainWindow!, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. The application will restart to apply the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    })
    .then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    title: 'POS Checkout',
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  const isDev = process.env.NODE_ENV === 'development';
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (isDev) {
    mainWindow.loadURL(devServerUrl).catch(() => undefined);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In packaged app, frontend dist is in resources/app/frontend-dist
    const indexPath = path.join(__dirname, '../frontend-dist/index.html');
    mainWindow.loadURL(
      url.pathToFileURL(indexPath).toString(),
    );
  }

  // External links open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  
  // Check for updates on startup (only in production)
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
    // Wait a bit before checking for updates to not slow down app startup
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('Failed to check for updates:', err);
      });
    }, 3000);
    
    // Check for updates every 4 hours
    setInterval(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('Failed to check for updates:', err);
      });
    }, 4 * 60 * 60 * 1000);
  }
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers
ipcMain.handle('app:get-info', () => ({
  name: app.getName(),
  version: app.getVersion(),
}));

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


