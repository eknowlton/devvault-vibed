import AsyncStorage from '@react-native-async-storage/async-storage';
import { Snippet } from '../types/snippet';
import { ServerConfig } from '../types/server';
import { SEED_SNIPPETS } from '../data/seedSnippets';

const STORAGE_KEY = '@devvault_snippets_v1';
const INITIALIZED_KEY = '@devvault_initialized_v1';
const SERVER_CONFIG_KEY = '@devvault_server_config_v1';

export const DEFAULT_SERVER_CONFIG: ServerConfig = {
  enabled: false,
  port: 4141,
  apiKey: '',
  allowWrite: false,
};

export async function getStoredSnippets(): Promise<Snippet[]> {
  try {
    const isInitialized = await AsyncStorage.getItem(INITIALIZED_KEY);
    const rawData = await AsyncStorage.getItem(STORAGE_KEY);

    if (!isInitialized || !rawData) {
      // First run: seed default snippets
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SNIPPETS));
      await AsyncStorage.setItem(INITIALIZED_KEY, 'true');
      return SEED_SNIPPETS;
    }

    const parsed: Snippet[] = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed : SEED_SNIPPETS;
  } catch (err) {
    console.error('Failed to read snippets from storage:', err);
    return SEED_SNIPPETS;
  }
}

export async function persistSnippets(snippets: Snippet[]): Promise<boolean> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
    if (typeof window !== 'undefined' && window.electronAPI?.saveSnippetsToFile) {
      window.electronAPI.saveSnippetsToFile(snippets).catch(() => {});
    }
    return true;
  } catch (err) {
    console.error('Failed to persist snippets:', err);
    return false;
  }
}

export async function addOrUpdateSnippet(snippet: Snippet): Promise<Snippet[]> {
  const current = await getStoredSnippets();
  const existingIndex = current.findIndex((s) => s.id === snippet.id);

  let updated: Snippet[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = {
      ...snippet,
      isPrivate: Boolean(snippet.isPrivate),
      updatedAt: Date.now(),
    };
  } else {
    updated = [
      {
        ...snippet,
        isPrivate: Boolean(snippet.isPrivate),
        createdAt: snippet.createdAt || Date.now(),
        updatedAt: Date.now(),
      },
      ...current,
    ];
  }

  await persistSnippets(updated);
  return updated;
}

export async function removeSnippet(id: string): Promise<Snippet[]> {
  const current = await getStoredSnippets();
  const updated = current.filter((s) => s.id !== id);
  await persistSnippets(updated);
  return updated;
}

export async function toggleSnippetStar(id: string): Promise<Snippet[]> {
  const current = await getStoredSnippets();
  const updated = current.map((s) =>
    s.id === id ? { ...s, starred: !s.starred, updatedAt: Date.now() } : s
  );
  await persistSnippets(updated);
  return updated;
}

export async function toggleSnippetVisibility(id: string): Promise<Snippet[]> {
  const current = await getStoredSnippets();
  const updated = current.map((s) =>
    s.id === id ? { ...s, isPrivate: !s.isPrivate, updatedAt: Date.now() } : s
  );
  await persistSnippets(updated);
  return updated;
}

export async function incrementSnippetCopyCount(id: string): Promise<Snippet[]> {
  const current = await getStoredSnippets();
  const updated = current.map((s) =>
    s.id === id ? { ...s, copyCount: (s.copyCount || 0) + 1 } : s
  );
  await persistSnippets(updated);
  return updated;
}

export async function resetSnippetsToSeed(): Promise<Snippet[]> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SNIPPETS));
  return SEED_SNIPPETS;
}

export async function exportSnippetsToJson(onlyPublic: boolean = false): Promise<string> {
  const current = await getStoredSnippets();
  const filtered = onlyPublic ? current.filter((s) => !s.isPrivate) : current;
  return JSON.stringify(filtered, null, 2);
}

export async function importSnippetsFromJson(
  jsonString: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return { success: false, error: 'Import data must be a JSON array of snippets' };
    }

    const current = await getStoredSnippets();
    const existingIds = new Set(current.map((s) => s.id));

    const validated: Snippet[] = [];
    for (const item of parsed) {
      if (item && item.title && item.content) {
        const id = item.id && !existingIds.has(item.id)
          ? item.id
          : `import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        validated.push({
          id,
          title: String(item.title),
          content: String(item.content),
          type: item.type === 'command' || item.type === 'snippet' || item.type === 'recipe' ? item.type : 'command',
          language: item.language || 'bash',
          description: item.description || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          category: item.category || 'General',
          platform: item.platform || 'all',
          starred: Boolean(item.starred),
          isPrivate: Boolean(item.isPrivate),
          copyCount: Number(item.copyCount) || 0,
          createdAt: Number(item.createdAt) || Date.now(),
          updatedAt: Number(item.updatedAt) || Date.now(),
        });
      }
    }

    const merged = [...validated, ...current];
    await persistSnippets(merged);
    return { success: true, count: validated.length };
  } catch (err: any) {
    return { success: false, error: err.message || 'Invalid JSON syntax' };
  }
}

// Server Configuration Persistence
export async function getStoredServerConfig(): Promise<ServerConfig> {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.getServerConfig) {
      const electronCfg = await window.electronAPI.getServerConfig();
      if (electronCfg) {
        return { ...DEFAULT_SERVER_CONFIG, ...electronCfg };
      }
    }
    const raw = await AsyncStorage.getItem(SERVER_CONFIG_KEY);
    if (!raw) return DEFAULT_SERVER_CONFIG;
    return { ...DEFAULT_SERVER_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SERVER_CONFIG;
  }
}

export async function persistServerConfig(config: ServerConfig): Promise<boolean> {
  try {
    await AsyncStorage.setItem(SERVER_CONFIG_KEY, JSON.stringify(config));
    if (typeof window !== 'undefined' && window.electronAPI?.saveServerConfig) {
      window.electronAPI.saveServerConfig(config).catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}
