type BackendStatusPayload = {
  status: "starting" | "ready" | "stopped" | "error";
  port: number;
  error?: string;
};

function sendBackendStatus(status: "starting" | "ready" | "stopped" | "error", errorMessage?: string) {
  log(`[Backend] Status update -> ${status}${errorMessage ? ": " + errorMessage : ""}`);
  lastBackendStatus = {
    status,
    port: BACKEND_PORT,
    error: errorMessage,
  };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(BACKEND_STATUS_CHANNEL, lastBackendStatus);
  }
}

function resolveBackendEntryPoint(): string {
  const candidates: string[] = [];

  if (app.isPackaged) {
    candidates.push(
      path.join(process.resourcesPath, "app.asar.unpacked", "backend-dist", "src", "main.js"),
      path.join(process.resourcesPath, "backend-dist", "src", "main.js"),
    );
  } else {
    const repoRoot = path.resolve(__dirname, "..", "..", "..");
    candidates.push(path.join(repoRoot, "apps", "backend", "dist", "src", "main.js"));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to locate backend entry point. Looked in: ${candidates.join(", ")}. ` +
      `Ensure the backend has been built and copied into the desktop bundle.`,
  );
}

async function waitForBackendHealth(timeoutMs = 40_000) {
  const start = Date.now();
  const healthUrl = `http://127.0.0.1:${BACKEND_PORT}${BACKEND_HEALTH_ENDPOINT}`;

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(healthUrl, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch (error) {
      log(`[Backend] Health check pending: ${(error as Error).message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Backend did not become healthy within ${timeoutMs / 1000}s (${healthUrl}).`);
}

async function startBackendProcess() {
  if (backendReady) {
    return;
  }

  if (backendStartPromise) {
    return backendStartPromise;
  }

  backendStartPromise = (async () => {
    sendBackendStatus("starting");

    const entry = resolveBackendEntryPoint();
    log(`[Backend] Starting process: ${entry}`);

    backendProcess = spawn(process.execPath, [entry], {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        DESKTOP_MODE: "true",
        PORT: String(BACKEND_PORT),
      },
      cwd: path.dirname(entry),
      stdio: "pipe",
    });

    backendProcess.stdout?.on("data", (data) => log(`[Backend][stdout] ${data}`));
    backendProcess.stderr?.on("data", (data) => log(`[Backend][stderr] ${data}`));

    backendProcess.on("exit", (code, signal) => {
      log(`[Backend] Process exited (code=${code}, signal=${signal})`);
      backendReady = false;
      backendStartPromise = null;
      sendBackendStatus("stopped");
    });

    await waitForBackendHealth();
    backendReady = true;
    sendBackendStatus("ready");
  })().catch((error) => {
    log(`[Backend] Failed to start`, error);
    backendStartPromise = null;
    backendReady = false;
    sendBackendStatus("error", error instanceof Error ? error.message : String(error));
    dialog.showErrorBox(
      "Backend Launch Failed",
      `The embedded API server could not be started. Please re-run desktop init scripts or reinstall.\n\n${error instanceof Error ? error.message : error}`,
    );
    throw error;
  });

  return backendStartPromise;
}

function stopBackendProcess() {
  if (!backendProcess) {
    return;
  }

  log(`[Backend] Terminating process...`);
  backendProcess.removeAllListeners();
  backendProcess.kill();
  backendProcess = null;
  backendReady = false;
  backendStartPromise = null;
  sendBackendStatus("stopped");
}

function handleLicenseStatusChange(status: ValidationResult) {
  lastLicenseStatus = status;
  if (status.isValid) {
    startBackendProcess().catch((error) => {
      log(`[License] Backend start failed after validation`, error);
    });
  } else {
    stopBackendProcess();
  }
}
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  dialog,
  protocol,
  session,
} from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import * as fs from "fs";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import deviceManager, { NativeDeviceSummary } from "./native/deviceManager";
import { registerLicensingHandlers } from "./licensing/licensing-ipc";
import { createMenu } from "./menu";
import { setupKeyboardShortcuts } from "./devtools";
import { ValidationResult, licenseManager } from "./licensing/LicenseManager";

// Create a lazy-initialized log stream
let logStream: fs.WriteStream | null = null;
let backendProcess: ChildProcessWithoutNullStreams | null = null;
let backendReady = false;
let backendStartPromise: Promise<void> | null = null;
let lastLicenseStatus: ValidationResult | null = null;
const BACKEND_PORT = parseInt(process.env.DESKTOP_BACKEND_PORT || "3110", 10);

let lastBackendStatus: BackendStatusPayload = {
  status: "stopped",
  port: BACKEND_PORT,
};
const BACKEND_HEALTH_ENDPOINT = process.env.DESKTOP_BACKEND_HEALTH || "/api/v1/health";
const BACKEND_STATUS_CHANNEL = "desktop-backend:status";

function ensureLogStream() {
  if (!logStream) {
    const logPath = path.join(app.getPath("userData"), "app.log");
    // Ensure directory exists
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    logStream = fs.createWriteStream(logPath, { flags: "a" });
  }
  return logStream;
}

function log(...args: any[]) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${args.map(a => typeof a === "object" ? JSON.stringify(a) : a).join(" ")}`;
  console.log(message);
  try {
    const stream = ensureLogStream();
    stream.write(message + "\n");
  } catch (e) {
    // Fallback if logging fails
    console.error("Failed to write log:", e);
  }
}

// Single instance
if (!app.requestSingleInstanceLock()) {
  log("[App] Another instance already running, quitting");
  app.quit();
}

app.commandLine.appendSwitch("enable-experimental-web-platform-features");
app.commandLine.appendSwitch("enable-web-bluetooth");
app.commandLine.appendSwitch(
  "unsafely-treat-insecure-origin-as-secure",
  "file://",
);

const BLUETOOTH_PERMISSIONS = new Set([
  "bluetooth",
  "bluetooth-scan",
  "bluetooth-connect",
]);

// Intercept file protocol to serve files from asar archive
function setupFileProtocol() {
  // Register custom app:// protocol using stream protocol (avoids file:// security restrictions)
  protocol.registerStreamProtocol("app", (request, callback) => {
    try {
      let url = request.url.substr(6); // Remove 'app://' prefix
      
      // Debug: Log raw URL
      if (!url.includes("checkout-icon")) { // Don't spam logs with icons
        log(`[PROTOCOL] Raw URL: "${request.url}"`);
      }

      // Handle paths like app://index.html or app://assets/...
      // Remove leading slashes
      while (url.startsWith("/")) {
        url = url.substring(1);
      }

      // Remove trailing slashes too
      while (url.endsWith("/") && url !== "/") {
        url = url.substring(0, url.length - 1);
      }

      // CRITICAL FIX: Handle malformed URLs like app://index.html/assets/... and app://index.html/file.ext
      // These happen when browser resolves relative paths relative to the requested HTML file
      // The pattern is: app://index.html/{anything}
      // We need to extract just the filename/path part and look it up at the root
      if (url.includes("index.html/")) {
        const parts = url.split("index.html/");
        if (parts.length === 2 && parts[1]) {
          url = parts[1];
          log(
            `[PROTOCOL] Rewriting relative URL: app://${request.url.substr(6)} -> app://${url}`,
          );
        }
      }

      // Remove query strings and fragments
      url = url.split("?")[0].split("#")[0];

      // If URL is empty or just whitespace, default to index.html
      if (!url || !url.trim()) {
        log(`[PROTOCOL] Empty URL detected, defaulting to index.html`);
        url = "index.html";
      }

      let filePath: string;

      if (app.isPackaged) {
        // In production, files are unpacked from app.asar to app.asar.unpacked/frontend-dist
        filePath = path.join(
          process.resourcesPath,
          "app.asar.unpacked",
          "frontend-dist",
          url,
        );
      } else {
        // In development, files are in frontend-dist
        filePath = path.join(__dirname, "..", "frontend-dist", url);
      }

      // Normalize path separators
      filePath = path.normalize(filePath);

      if (!url.includes("checkout-icon")) { // Don't spam logs with icons
        log(`[PROTOCOL] Resolved to: "${filePath}"`);
      }

      try {
        // If path is a directory, try index.html
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            filePath = path.join(filePath, "index.html");
            log(`[PROTOCOL] Path is directory, serving index.html: ${filePath}`);
          }
        }

        if (fs.existsSync(filePath)) {
          // Determine MIME type based on file extension
          const ext = path.extname(filePath).toLowerCase();
          let mimeType = "application/octet-stream";
          
          if (ext === ".html") mimeType = "text/html";
          else if (ext === ".js") mimeType = "application/javascript";
          else if (ext === ".css") mimeType = "text/css";
          else if (ext === ".json") mimeType = "application/json";
          else if (ext === ".png") mimeType = "image/png";
          else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
          else if (ext === ".gif") mimeType = "image/gif";
          else if (ext === ".svg") mimeType = "image/svg+xml";
          else if (ext === ".ico") mimeType = "image/x-icon";
          else if (ext === ".woff") mimeType = "font/woff";
          else if (ext === ".woff2") mimeType = "font/woff2";

          callback({
            statusCode: 200,
            headers: { "Content-Type": mimeType },
            data: fs.createReadStream(filePath),
          });
          if (!url.includes("checkout-icon")) { // Don't spam logs with icons
            log(`[PROTOCOL] Served ${ext}: ${filePath}`);
          }
        } else {
          log(
            `[PROTOCOL] File not found: ${filePath} (requested: ${request.url})`,
          );
          // Try to provide helpful debug info
          const dirPath = path.dirname(filePath);
          if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath).slice(0, 5);
            log(`[PROTOCOL] Directory exists, sample files: ${files.join(", ")}`);
          }
          callback({ statusCode: 404 });
        }
      } catch (error) {
        log(`[PROTOCOL] Error accessing file: ${filePath}`, error);
        callback({ statusCode: 500 });
      }
    } catch (error) {
      log(`[PROTOCOL] Fatal error in protocol handler:`, error);
      callback({ statusCode: 500 });
    }
  });
}

// Register protocol schemes before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
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
      const packagedIcon = path.join(
        process.resourcesPath,
        process.platform === "win32" ? "icon.ico" : "icon.png",
      );
      return packagedIcon;
    }
    return path.join(__dirname, "../build/icon.png");
  } catch (error) {
    log("[App] Unable to resolve application icon", error);
    return undefined;
  }
}

function createWindow() {
  log("[Main] Creating window...");
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      experimentalFeatures: true,
    },
    title: "Checkout POS",
    icon: resolveAppIcon(),
    show: false,
    backgroundColor: "#0f172a", // slate-900 background to match app theme
  });

  log("[Main] Window created, setting up keyboard shortcuts...");
  setupKeyboardShortcuts(mainWindow);

  log("[Main] Window created, registering ready-to-show handler...");
  mainWindow.once("ready-to-show", () => {
    log("[Main] Window ready to show, displaying...");
    mainWindow?.show();
  });

  // Open DevTools automatically when running against Vite dev server
  if (process.env.VITE_DEV_SERVER_URL || process.env.DEBUG_MODE === "true" || process.env.NODE_ENV === "development") {
    try {
      // Use detached mode so DevTools remains available if renderer reloads
      mainWindow.webContents.openDevTools({ mode: "detach" });
      log("[Main] DevTools opened for debugging");
    } catch (err) {
      log("[Main] Failed to open DevTools:", err);
    }
  }

  // Consider dev mode when NODE_ENV=development OR a Vite dev server URL is provided
  const isDev = process.env.NODE_ENV === "development" || !!process.env.VITE_DEV_SERVER_URL;
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";

  log("[Main] NODE_ENV:", process.env.NODE_ENV);
  log("[Main] Loading URL...");
  
  if (isDev) {
    // In development, load from dev server - routing will handle login redirect
    log("[Main] Development mode: loading from", devServerUrl);
    mainWindow.loadURL(devServerUrl).catch((e) => {
      log("[Main] Failed to load dev server", e);
    });
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    // In production, use app:// protocol via custom stream protocol handler
    log("[Main] Production mode: loading app://index.html");
    mainWindow.loadURL("app://index.html").catch((error) => {
      log("[Main] Failed to load index.html via app protocol", error);
    });
    // Open DevTools in production to see errors
    mainWindow.webContents.openDevTools({ mode: "detach" });
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

  mainWindow.webContents.on(
    "select-bluetooth-device",
    (event, devices, callback) => {
      event.preventDefault();

      if (!devices || devices.length === 0) {
        callback("");
        return;
      }

      const preferred =
        devices.find((device) =>
          device.deviceName?.toLowerCase().includes("scanner"),
        ) ?? devices[0];
      callback(preferred.deviceId);
    },
  );

  const forwardDevices = (devices: NativeDeviceSummary[]) => {
    if (!mainWindow || mainWindow.webContents.isDestroyed()) {
      return;
    }

    mainWindow.webContents.send("native-devices:updated", devices);
  };

  deviceManager.on("devices-updated", forwardDevices);
  forwardDevices(deviceManager.getConnectedDevices());

  // External links open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    shell.openExternal(target);
    return { action: "deny" };
  });

  // Forward renderer console messages to main log so packaged apps
  // (where DevTools may be detached) still surface renderer errors
  // in the main process log (`app.log`). This helps capture runtime
  // errors from minified bundles when investigating crashes.
  mainWindow.webContents.on(
    "console-message",
    (_event, level: number, message: string, line: number, sourceId: string) => {
      log(`[Renderer][Console][level=${level}] ${message} (${sourceId}:${line})`);
    },
  );

  mainWindow.on("closed", () => {
    deviceManager.removeListener("devices-updated", forwardDevices);
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  ipcMain.handle("app:get-info", () => ({
    name: app.getName(),
    version: app.getVersion(),
  }));

  ipcMain.handle("desktop-backend:getStatus", () => lastBackendStatus);

  ipcMain.handle("native-devices:list", (): NativeDeviceSummary[] =>
    deviceManager.refreshDevices(),
  );

  ipcMain.handle(
    "native-devices:scan",
    async (_event, timeoutMs?: number): Promise<NativeDeviceSummary[]> => {
      if (timeoutMs && timeoutMs > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(timeoutMs, 2000)),
        );
      }

      return deviceManager.scanBluetoothDevices();
    },
  );

  // Handle navigation from menu
  ipcMain.on("navigation:route", (_event, route: string) => {
    console.log("[Main] Navigating to:", route);
    if (mainWindow) {
      mainWindow.webContents.send("router:navigate", route);
    }
  });
}

app.whenReady().then(() => {
  console.log("[Main] App is ready, setting up...");
  // Setup protocol handlers after app is ready
  setupFileProtocol();
  console.log("[Main] File protocol setup complete");
  registerIpcHandlers();
  console.log("[Main] IPC handlers registered");
  registerLicensingHandlers({
    getMainWindow: () => mainWindow,
    onStatusChanged: handleLicenseStatusChange,
  });
  console.log("[Main] Licensing handlers registered");

  // Prime backend state based on cached license before renderer mounts
  const initialStatus = licenseManager.validateLicense();
  handleLicenseStatusChange(initialStatus);
  createWindow();
  console.log("[Main] Window creation initiated");
  
  // Create application menu
  if (mainWindow) {
    createMenu(mainWindow);
    log("[Main] Application menu created");
  }
});

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("window-all-closed", async () => {
  if (process.platform !== "darwin") {
    await deviceManager.dispose();
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Ensure native resources are cleaned up
app.on("before-quit", async () => {
  stopBackendProcess();
  await deviceManager.dispose();
});

// Manual update check
ipcMain.handle("app:check-for-updates", async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Download update
ipcMain.handle("app:download-update", () => {
  autoUpdater.downloadUpdate();
  return { success: true };
});

// Install update
ipcMain.handle("app:install-update", () => {
  autoUpdater.quitAndInstall(false, true);
  return { success: true };
});
