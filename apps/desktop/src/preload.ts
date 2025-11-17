import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('posApp', {
  getInfo: async () => ipcRenderer.invoke('app:get-info'),
  checkForUpdates: async () => ipcRenderer.invoke('app:check-for-updates'),
  downloadUpdate: async () => ipcRenderer.invoke('app:download-update'),
  installUpdate: async () => ipcRenderer.invoke('app:install-update'),
  onUpdateStatus: (callback: (status: any) => void) => {
    ipcRenderer.on('update-status', (_event, status) => callback(status));
  },
  onUpdateProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('update-progress', (_event, progress) => callback(progress));
  },
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-status');
    ipcRenderer.removeAllListeners('update-progress');
  },
});

export {};


