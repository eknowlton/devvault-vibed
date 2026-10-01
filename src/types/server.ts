export interface ServerConfig {
  enabled: boolean;
  port: number;
  apiKey: string;
  allowWrite: boolean;
}

export interface ServerStatusResponse {
  status: 'ok' | 'error';
  version: string;
  mode?: 'embedded' | 'standalone';
  totalSnippets: number;
  publicSnippets: number;
  privateSnippets: number;
  totalCommands?: number;
  totalRecipes?: number;
  publicCommands?: number;
  publicRecipes?: number;
  allowWrite: boolean;
  requiresAuth: boolean;
}

export interface ElectronAPI {
  isElectron: boolean;
  getPlatform: () => Promise<'win32' | 'linux' | 'darwin'>;
  startServer: (config: ServerConfig) => Promise<{ success: boolean; port?: number; url?: string; error?: string }>;
  stopServer: () => Promise<{ success: boolean; error?: string }>;
  getServerStatus: () => Promise<{ running: boolean; port: number | null; url?: string; totalSnippets?: number }>;
  getServerConfig: () => Promise<ServerConfig>;
  saveServerConfig: (config: ServerConfig) => Promise<boolean>;
  onServerStateChange: (callback: (data: { running: boolean; port?: number; url?: string }) => void) => () => void;
  saveSnippetsToFile: (snippets: any[]) => Promise<{ success: boolean; error?: string }>;
  loadSnippetsFromFile: () => Promise<any[] | null>;
  openExternal: (url: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
