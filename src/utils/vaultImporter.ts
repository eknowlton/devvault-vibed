/**
 * DevVault Remote API Importer & Deduplication Engine
 * Connects to peer/remote DevVault instances to fetch and import
 * commands, recipes, and snippets while strictly preventing duplicate entries.
 */

import { Snippet, SnippetType } from '../types/snippet';
import { persistSnippets } from '../storage/snippetStorage';

export type ImportEndpointType = 'all' | 'commands' | 'recipes' | 'snippets';

export interface DeduplicationComparison {
  isDuplicate: boolean;
  matchType?: 'exact_id' | 'identical_content' | 'identical_title_and_content';
  matchedSnippet?: Snippet;
  reason?: string;
}

export interface RemoteItemPreview {
  item: Snippet;
  isDuplicate: boolean;
  duplicateReason?: string;
  matchedSnippetTitle?: string;
  selected: boolean;
}

export interface RemoteFetchResult {
  success: boolean;
  url: string;
  endpoint: string;
  count: number;
  items: RemoteItemPreview[];
  duplicatesCount: number;
  newCount: number;
  error?: string;
}

/**
 * Normalizes code/command content for accurate comparison:
 * handles carriage returns, extra blank lines, and trailing spaces.
 */
export function normalizeCodeContent(content: string): string {
  if (!content) return '';
  return content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .toLowerCase();
}

/**
 * Checks whether an incoming snippet duplicates any existing snippet in the user's vault.
 * Compares by:
 * 1. Exact ID
 * 2. Exact command / recipe code content (normalized)
 * 3. Exact Title + Content match
 */
export function checkIsDuplicate(
  incoming: Partial<Snippet>,
  existingSnippets: Snippet[]
): DeduplicationComparison {
  if (!incoming.content || !incoming.title) {
    return { isDuplicate: false };
  }

  const normIncomingContent = normalizeCodeContent(incoming.content);
  const normIncomingTitle = incoming.title.trim().toLowerCase();

  // 1. Exact ID match
  if (incoming.id) {
    const idMatch = existingSnippets.find((s) => s.id === incoming.id);
    if (idMatch) {
      return {
        isDuplicate: true,
        matchType: 'exact_id',
        matchedSnippet: idMatch,
        reason: `Matches existing entry ID: '${idMatch.title}'`,
      };
    }
  }

  // 2. Identical script content match (with compatible type)
  const contentMatch = existingSnippets.find((s) => {
    const normExistingContent = normalizeCodeContent(s.content);
    if (normExistingContent !== normIncomingContent) return false;

    // If both have specific types and types conflict, don't consider duplicate
    if (incoming.type && s.type && incoming.type !== s.type) {
      return false;
    }
    return true;
  });

  if (contentMatch) {
    return {
      isDuplicate: true,
      matchType: 'identical_content',
      matchedSnippet: contentMatch,
      reason: `Identical script content already exists in '${contentMatch.title}'`,
    };
  }

  // 3. Exact Title and Content match
  const titleAndContentMatch = existingSnippets.find((s) => {
    const isSameTitle = s.title.trim().toLowerCase() === normIncomingTitle;
    const isSameContent = normalizeCodeContent(s.content) === normIncomingContent;
    return isSameTitle && isSameContent;
  });

  if (titleAndContentMatch) {
    return {
      isDuplicate: true,
      matchType: 'identical_title_and_content',
      matchedSnippet: titleAndContentMatch,
      reason: `Duplicate title and commands already exist in '${titleAndContentMatch.title}'`,
    };
  }

  return { isDuplicate: false };
}

/**
 * Normalizes user-entered URLs into clean base URLs.
 */
export function normalizeServerUrl(rawUrl: string): string {
  let cleaned = rawUrl.trim();
  if (!cleaned) return 'http://localhost:4141';

  // Prepend http:// if no protocol provided
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `http://${cleaned}`;
  }

  // Strip trailing slashes
  return cleaned.replace(/\/+$/, '');
}

/**
 * Fetches commands, recipes, or snippets from a remote DevVault API instance.
 */
export async function fetchRemoteVault(
  baseUrl: string,
  existingSnippets: Snippet[],
  options: {
    token?: string;
    endpointType?: ImportEndpointType;
  } = {}
): Promise<RemoteFetchResult> {
  const cleanUrl = normalizeServerUrl(baseUrl);
  const endpointType = options.endpointType || 'all';

  let path = '/api/snippets';
  if (endpointType === 'commands') path = '/api/commands';
  else if (endpointType === 'recipes') path = '/api/recipes';
  else if (endpointType === 'snippets') path = '/api/snippets?type=snippet';

  const targetUrl = `${cleanUrl}${path}`;

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (options.token && options.token.trim()) {
      headers['Authorization'] = `Bearer ${options.token.trim()}`;
    }

    // Set timeout to avoid hanging indefinitely if remote host is unreachable
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        url: cleanUrl,
        endpoint: path,
        count: 0,
        items: [],
        duplicatesCount: 0,
        newCount: 0,
        error: 'Authentication failed. Please verify the API token for this remote vault.',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        url: cleanUrl,
        endpoint: path,
        count: 0,
        items: [],
        duplicatesCount: 0,
        newCount: 0,
        error: `Remote server responded with HTTP status ${response.status} (${response.statusText}).`,
      };
    }

    const data = await response.json();

    // Extract list based on endpoint structure
    let rawList: any[] = [];
    if (Array.isArray(data)) {
      rawList = data;
    } else if (Array.isArray(data.snippets)) {
      rawList = data.snippets;
    } else if (Array.isArray(data.commands)) {
      rawList = data.commands;
    } else if (Array.isArray(data.recipes)) {
      rawList = data.recipes;
    }

    if (!Array.isArray(rawList)) {
      return {
        success: false,
        url: cleanUrl,
        endpoint: path,
        count: 0,
        items: [],
        duplicatesCount: 0,
        newCount: 0,
        error: 'Unexpected response format from remote DevVault server.',
      };
    }

    let duplicatesCount = 0;
    let newCount = 0;

    const items: RemoteItemPreview[] = rawList
      .filter((item) => item && typeof item.title === 'string' && typeof item.content === 'string')
      .map((raw) => {
        const type: SnippetType =
          raw.type === 'command' || raw.type === 'snippet' || raw.type === 'recipe'
            ? raw.type
            : 'command';

        const snippetItem: Snippet = {
          id: raw.id || `remote-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: String(raw.title),
          content: String(raw.content),
          type,
          language: raw.language || 'bash',
          description: raw.description || '',
          tags: Array.isArray(raw.tags) ? raw.tags : [],
          category: raw.category || 'General',
          platform: raw.platform || 'all',
          starred: Boolean(raw.starred),
          isPrivate: Boolean(raw.isPrivate),
          expectedOutput: raw.expectedOutput ? String(raw.expectedOutput) : undefined,
          executionDuration: raw.executionDuration ? String(raw.executionDuration) : undefined,
          simulatedPrompt: raw.simulatedPrompt ? String(raw.simulatedPrompt) : undefined,
          simulatedUser: raw.simulatedUser ? String(raw.simulatedUser) : undefined,
          simulatedHost: raw.simulatedHost ? String(raw.simulatedHost) : undefined,
          simulatedCwd: raw.simulatedCwd ? String(raw.simulatedCwd) : undefined,
          copyCount: 0,
          createdAt: Number(raw.createdAt) || Date.now(),
          updatedAt: Date.now(),
        };

        const dup = checkIsDuplicate(snippetItem, existingSnippets);

        if (dup.isDuplicate) {
          duplicatesCount++;
        } else {
          newCount++;
        }

        return {
          item: snippetItem,
          isDuplicate: dup.isDuplicate,
          duplicateReason: dup.reason,
          matchedSnippetTitle: dup.matchedSnippet?.title,
          // Unselect duplicates by default; select new items
          selected: !dup.isDuplicate,
        };
      });

    return {
      success: true,
      url: cleanUrl,
      endpoint: path,
      count: items.length,
      items,
      duplicatesCount,
      newCount,
    };
  } catch (err: any) {
    let msg = err.message || 'Unknown network error';
    if (err.name === 'AbortError') {
      msg = 'Connection timed out. Remote DevVault server did not respond within 9s.';
    } else if (msg.includes('Network request failed') || msg.includes('Failed to fetch')) {
      msg = `Cannot reach ${cleanUrl}. Check that the remote DevVault server is active and accessible.`;
    }

    return {
      success: false,
      url: cleanUrl,
      endpoint: path,
      count: 0,
      items: [],
      duplicatesCount: 0,
      newCount: 0,
      error: msg,
    };
  }
}

/**
 * Commits the selected remote items into the user's local vault,
 * guaranteeing no duplicate entries are introduced.
 */
export async function commitImportedItems(
  itemsToImport: Snippet[],
  existingSnippets: Snippet[],
  options: {
    addImportedTag?: boolean;
    remoteHost?: string;
  } = {}
): Promise<{ updatedSnippets: Snippet[]; importedCount: number }> {
  if (itemsToImport.length === 0) {
    return { updatedSnippets: existingSnippets, importedCount: 0 };
  }

  const existingIds = new Set(existingSnippets.map((s) => s.id));
  const newItems: Snippet[] = [];

  for (const item of itemsToImport) {
    // Generate fresh unique ID if ID already exists
    const finalId =
      item.id && !existingIds.has(item.id)
        ? item.id
        : `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    existingIds.add(finalId);

    const tags = [...item.tags];
    if (options.addImportedTag !== false && !tags.includes('imported')) {
      tags.push('imported');
    }

    newItems.push({
      ...item,
      id: finalId,
      tags,
      isPrivate: false, // Default imported items to public for easy viewing unless edited
      copyCount: 0,
      createdAt: item.createdAt || Date.now(),
      updatedAt: Date.now(),
    });
  }

  const merged = [...newItems, ...existingSnippets];
  await persistSnippets(merged);

  return {
    updatedSnippets: merged,
    importedCount: newItems.length,
  };
}
