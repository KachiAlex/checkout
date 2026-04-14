import { app, BrowserWindow } from "electron";

declare global {
  var mainWindow: BrowserWindow | null;
}

export function enableDevToolsShortcut() {
  // F12 to open DevTools when app is running
  if (global.mainWindow) {
    // Open devtools automatically in development
    if (process.env.DEBUG_MODE === "true") {
      global.mainWindow.webContents.openDevTools();
    }
  }
}

// Add keyboard shortcut for DevTools
export function setupKeyboardShortcuts(mainWindow: BrowserWindow) {
  mainWindow.webContents.on("before-input-event", (event, input) => {
    // F12 opens DevTools
    if (input.key.toLowerCase() === "f12" || 
        (input.control && input.shift && input.key.toLowerCase() === "i")) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
}
