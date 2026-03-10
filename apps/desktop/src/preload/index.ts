import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  closeWindow: () => Promise<void>
  isPackaged: () => Promise<boolean>
  minimizeWindow: () => Promise<void>
  platform: NodeJS.Platform
}

const electronAPI: ElectronAPI = {
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isPackaged: () => ipcRenderer.invoke('app:is-packaged'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  platform: process.platform
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
