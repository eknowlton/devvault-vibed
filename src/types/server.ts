export interface ServerConfig {
  enabled: boolean;
  port: number;
  apiKey: string;
  allowWrite: boolean;
}

export interface ServerStatusResponse {
  status: 'ok' | 'error';
  version: string;
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
