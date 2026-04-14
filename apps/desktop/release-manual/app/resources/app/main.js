"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const deviceManager_1 = __importDefault(require("./native/deviceManager"));
const licensing_ipc_1 = require("./licensing/licensing-ipc");
// Single instance
if (!electron_1.app.requestSingleInstanceLock()) {
    electron_1.app.quit();
}
electron_1.app.commandLine.appendSwitch("enable-experimental-web-platform-features");
electron_1.app.commandLine.appendSwitch("enable-web-bluetooth");
electron_1.app.commandLine.appendSwitch("unsafely-treat-insecure-origin-as-secure", "file://");
const BLUETOOTH_PERMISSIONS = new Set([
    "bluetooth",
    "bluetooth-scan",
    "bluetooth-connect",
]);
// Intercept file protocol to serve files from asar archive
function setupFileProtocol() {
    // Register custom app:// protocol
    electron_1.protocol.registerFileProtocol("app", (request, callback) => {
        let url = request.url.substr(6); // Remove 'app://' prefix
        // CRITICAL FIX: Handle malformed URLs like app://index.html/assets/...
        // These happen when browser resolves /assets/ relative to app://index.html
        // Rewrite them to app://assets/...
        if (url.includes("index.html/assets/") || url.includes("index.html/")) {
            url = url.replace(/index\.html\//g, "");
            console.log(`[app://] Rewriting malformed URL: ${request.url} -> app://${url}`);
        }
        // Handle paths like app://index.html or app://assets/...
        // Remove leading slashes
        while (url.startsWith("/")) {
            url = url.substring(1);
        }
        // Remove query strings and fragments
        url = url.split("?")[0].split("#")[0];
        let filePath;
        if (electron_1.app.isPackaged) {
            // In production, files are in app.asar/frontend-dist
            filePath = path.join(process.resourcesPath, "app.asar", "frontend-dist", url);
        }
        else {
            // In development, files are in frontend-dist
            filePath = path.join(__dirname, "..", "frontend-dist", url);
        }
        // Normalize path separators
        filePath = path.normalize(filePath);
        // Check if file exists
        try {
            if (fs.existsSync(filePath)) {
                callback({ path: filePath });
            }
            else {
                console.error(`[app://] File not found: ${filePath} (requested: ${request.url}, cleaned: ${url})`);
                // Try without the leading path segment if it's an asset
                if (url.startsWith("assets/")) {
                    const altPath = path.join(process.resourcesPath, "app.asar", "frontend-dist", url);
                    if (fs.existsSync(altPath)) {
                        console.log(`[app://] Found file at alternative path: ${altPath}`);
                        callback({ path: altPath });
                        return;
                    }
                }
                callback({ error: -6 }); // FILE_NOT_FOUND
            }
        }
        catch (error) {
            console.error(`[app://] Error accessing file: ${filePath}`, error);
            callback({ error: -6 });
        }
    });
    // Also intercept standard file:// protocol for asar files
    electron_1.protocol.interceptFileProtocol("file", (request, callback) => {
        const fileUrl = request.url;
        // Check if this is a request for a file in our app.asar
        if (electron_1.app.isPackaged && fileUrl.includes("app.asar")) {
            // Extract the path after app.asar
            const asarMatch = fileUrl.match(/app\.asar[\\\/](.+)$/i);
            if (asarMatch) {
                const relativePath = asarMatch[1].replace(/\\/g, "/");
                const filePath = path.join(process.resourcesPath, "app.asar", relativePath);
                try {
                    if (fs.existsSync(filePath)) {
                        callback({ path: filePath });
                        return;
                    }
                }
                catch (error) {
                    console.error(`[file://] Error accessing asar file: ${filePath}`, error);
                }
            }
        }
        // For non-asar files, use default file protocol behavior
        callback({ path: fileUrl.replace(/^file:\/\//, "") });
    });
}
// Register protocol schemes before app is ready
electron_1.protocol.registerSchemesAsPrivileged([
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
let mainWindow = null;
function resolveAppIcon() {
    try {
        if (electron_1.app.isPackaged) {
            const packagedIcon = path.join(process.resourcesPath, process.platform === "win32" ? "icon.ico" : "icon.png");
            return packagedIcon;
        }
        return path.join(__dirname, "../build/icon.png");
    }
    catch (error) {
        console.warn("[App] Unable to resolve application icon", error);
        return undefined;
    }
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
    mainWindow.once("ready-to-show", () => mainWindow?.show());
    const isDev = process.env.NODE_ENV === "development";
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    if (isDev) {
        // In development, load from dev server - routing will handle login redirect
        mainWindow.loadURL(devServerUrl).catch(() => undefined);
        mainWindow.webContents.openDevTools({ mode: "detach" });
    }
    else {
        // In production, use app:// protocol with proper base tag
        // The base tag in HTML will ensure assets resolve correctly
        mainWindow.loadURL("app://index.html").catch((error) => {
            console.error("Failed to load index.html via app protocol", error);
            // Fallback: try loadFile
            if (mainWindow) {
                const packagedIndexPath = path.join(process.resourcesPath, "app.asar", "frontend-dist", "index.html");
                mainWindow.loadFile(packagedIndexPath).catch((fallbackError) => {
                    console.error("Failed to load from file protocol", fallbackError);
                });
            }
        });
    }
    // Additional webRequest interceptor as backup (protocol handler should handle it, but this is a safety net)
    if (!isDev && mainWindow) {
        const webSession = mainWindow.webContents.session;
        webSession.webRequest.onBeforeRequest({ urls: ["app://*"] }, (details, callback) => {
            // If request is for assets and includes index.html in path, rewrite it
            if (details.url.includes("index.html/assets/") ||
                details.url.includes("index.html/")) {
                const correctedUrl = details.url.replace(/index\.html\//g, "");
                console.log(`[webRequest] Rewriting URL: ${details.url} -> ${correctedUrl}`);
                callback({ redirectURL: correctedUrl });
            }
            else {
                callback({});
            }
        });
    }
    const webSession = mainWindow.webContents.session;
    webSession.setPermissionCheckHandler((_, permission) => {
        const permissionName = permission;
        return BLUETOOTH_PERMISSIONS.has(permissionName);
    });
    webSession.setPermissionRequestHandler((_, permission, callback) => {
        const permissionName = permission;
        if (BLUETOOTH_PERMISSIONS.has(permissionName)) {
            callback(true);
            return;
        }
        callback(false);
    });
    mainWindow.webContents.on("select-bluetooth-device", (event, devices, callback) => {
        event.preventDefault();
        if (!devices || devices.length === 0) {
            callback("");
            return;
        }
        const preferred = devices.find((device) => device.deviceName?.toLowerCase().includes("scanner")) ?? devices[0];
        callback(preferred.deviceId);
    });
    const forwardDevices = (devices) => {
        if (!mainWindow || mainWindow.webContents.isDestroyed()) {
            return;
        }
        mainWindow.webContents.send("native-devices:updated", devices);
    };
    deviceManager_1.default.on("devices-updated", forwardDevices);
    forwardDevices(deviceManager_1.default.getConnectedDevices());
    // External links open in default browser
    mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
        electron_1.shell.openExternal(target);
        return { action: "deny" };
    });
    mainWindow.on("closed", () => {
        deviceManager_1.default.removeListener("devices-updated", forwardDevices);
        mainWindow = null;
    });
}
function registerIpcHandlers() {
    electron_1.ipcMain.handle("app:get-info", () => ({
        name: electron_1.app.getName(),
        version: electron_1.app.getVersion(),
    }));
    electron_1.ipcMain.handle("native-devices:list", () => deviceManager_1.default.refreshDevices());
    electron_1.ipcMain.handle("native-devices:scan", async (_event, timeoutMs) => {
        if (timeoutMs && timeoutMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, Math.min(timeoutMs, 2000)));
        }
        return deviceManager_1.default.scanBluetoothDevices();
    });
}
electron_1.app.whenReady().then(() => {
    // Setup protocol handlers after app is ready
    setupFileProtocol();
    registerIpcHandlers();
    (0, licensing_ipc_1.registerLicensingHandlers)();
    createWindow();
});
electron_1.app.on("second-instance", () => {
    if (mainWindow) {
        if (mainWindow.isMinimized())
            mainWindow.restore();
        mainWindow.focus();
    }
});
electron_1.app.on("window-all-closed", async () => {
    if (process.platform !== "darwin") {
        await deviceManager_1.default.dispose();
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
// Ensure native resources are cleaned up
electron_1.app.on("before-quit", async () => {
    await deviceManager_1.default.dispose();
});
// Manual update check
electron_1.ipcMain.handle("app:check-for-updates", async () => {
    try {
        const result = await electron_updater_1.autoUpdater.checkForUpdates();
        return { success: true, updateInfo: result?.updateInfo };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// Download update
electron_1.ipcMain.handle("app:download-update", () => {
    electron_updater_1.autoUpdater.downloadUpdate();
    return { success: true };
});
// Install update
electron_1.ipcMain.handle("app:install-update", () => {
    electron_updater_1.autoUpdater.quitAndInstall(false, true);
    return { success: true };
});
//# sourceMappingURL=main.js.map