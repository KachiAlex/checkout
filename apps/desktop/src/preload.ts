import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('posApp', {
  getInfo: async () => ipcRenderer.invoke('app:get-info'),
});

export {};


