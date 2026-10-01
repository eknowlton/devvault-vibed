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
  allowWrite: boolean;
  requiresAuth: boolean;
}
