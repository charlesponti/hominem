export interface ElectronAPI {
  closeWindow: () => Promise<void>;
  isPackaged: () => Promise<boolean>;
  minimizeWindow: () => Promise<void>;
  platform: NodeJS.Platform;
}

interface ImportMetaEnv {
  readonly VITE_PUBLIC_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
