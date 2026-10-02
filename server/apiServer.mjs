#!/usr/bin/env node

/**
 * DevVault Embedded API Server
 * A lightweight, zero-dependency REST API server exposing the programmer notebook.
 * Features dedicated endpoints for commands, recipes, and snippets.
 * Respects public vs private entry visibility and supports token authentication.
 * Can be run standalone via CLI or embedded programmatically inside desktop/node runtimes.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_FILE = path.join(__dirname, '..', 'devvault-data.json');
const DEFAULT_CONFIG_FILE = path.join(__dirname, '..', 'server-config.json');

// Default Seed Data Fallback
export const DEFAULT_SNIPPETS = [
  {
    id: 'seed-git-undo-commit',
    title: 'Undo last commit (keep changes staged)',
    content: 'git reset --soft HEAD~1',
    type: 'command',
    language: 'bash',
    description: 'Undoes the most recent commit while preserving all modified files.',
    tags: ['git', 'undo', 'commit', 'staging'],
    category: 'Git',
    platform: 'all',
    starred: true,
    isPrivate: false,
    copyCount: 14,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'seed-docker-nuke-everything',
    title: 'Docker complete system prune (cleanup all unused resources)',
    content: 'docker system prune -a --volumes -f',
    type: 'command',
    language: 'bash',
    description: 'Removes all stopped containers, unused networks, and build volumes.',
    tags: ['docker', 'cleanup', 'prune'],
    category: 'Docker',
    platform: 'all',
    starred: true,
    isPrivate: false,
    copyCount: 29,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'seed-curl-timing-breakdown',
    title: 'Measure HTTP latency and DNS timing breakdown with curl',
    content: "curl -w \"@-\" -o /dev/null -s \"{{URL:https://api.github.com}}\" << 'EOF'\n  time_namelookup:  %{time_namelookup}s\n     time_connect:  %{time_connect}s\n  time_appconnect:  %{time_appconnect}s\n time_pretransfer:  %{time_pretransfer}s\n    time_redirect:  %{time_redirect}s\ntime_starttransfer: %{time_starttransfer}s\n                   ----------\n       time_total:  %{time_total}s\nEOF",
    type: 'recipe',
    language: 'bash',
    description: 'Prints detailed millisecond timing benchmarks for DNS resolution, TCP handshake, TLS/SSL handshake, and Time-to-First-Byte (TTFB).',
    tags: ['curl', 'http', 'latency', 'dns', 'performance'],
    category: 'Curl & Network',
    platform: 'all',
    starred: true,
    isPrivate: false,
    copyCount: 22,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'seed-k8s-decode-secret',
    title: 'Decode base64 Kubernetes Secret key',
    content: "kubectl get secret {{SECRET_NAME:app-secrets}} -n {{NAMESPACE:default}} -o jsonpath=\"{.data.{{KEY_NAME:api_key}}}\" | base64 --decode",
    type: 'command',
    language: 'bash',
    description: 'Extracts a specific key from a Kubernetes Secret and decodes base64.',
    tags: ['k8s', 'secret', 'security'],
    category: 'Kubernetes',
    platform: 'all',
    starred: false,
    isPrivate: true,
    copyCount: 16,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

// Helper: Normalize script content for deduplication
export function normalizeContent(str) {
  if (!str) return '';
  return str
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')
    .toLowerCase();
}

export function checkDuplicateSnippet(incoming, existingList) {
  if (!incoming.content || !incoming.title) return { isDuplicate: false };
  const normIncomingContent = normalizeContent(incoming.content);
  const normIncomingTitle = incoming.title.trim().toLowerCase();

  // 1. ID check
  if (incoming.id && existingList.some((s) => s.id === incoming.id)) {
    return { isDuplicate: true, reason: 'Duplicate ID' };
  }

  // 2. Exact content check
  const contentMatch = existingList.find((s) => normalizeContent(s.content) === normIncomingContent);
  if (contentMatch) {
    return {
      isDuplicate: true,
      reason: `Identical script content already exists in '${contentMatch.title}'`,
      matched: contentMatch.title,
    };
  }

  // 3. Title + content check
  const titleAndContentMatch = existingList.find(
    (s) =>
      s.title.trim().toLowerCase() === normIncomingTitle &&
      normalizeContent(s.content) === normIncomingContent
  );
  if (titleAndContentMatch) {
    return {
      isDuplicate: true,
      reason: `Duplicate title and content in '${titleAndContentMatch.title}'`,
      matched: titleAndContentMatch.title,
    };
  }

  return { isDuplicate: false };
}

// Filter list helper
function filterList(list, { query, tag, category, platform, authorized }) {
  let filtered = list;
  if (!authorized) {
    filtered = filtered.filter((s) => !s.isPrivate);
  }
  if (category) {
    filtered = filtered.filter((s) => s.category && s.category.toLowerCase() === category);
  }
  if (tag) {
    filtered = filtered.filter((s) => Array.isArray(s.tags) && s.tags.some((t) => t.toLowerCase() === tag));
  }
  if (platform && platform !== 'all') {
    filtered = filtered.filter((s) => s.platform === 'all' || (s.platform && s.platform.toLowerCase() === platform));
  }
  if (query) {
    filtered = filtered.filter((s) => {
      return (
        (s.title && s.title.toLowerCase().includes(query)) ||
        (s.content && s.content.toLowerCase().includes(query)) ||
        (s.description && s.description.toLowerCase().includes(query)) ||
        (Array.isArray(s.tags) && s.tags.some((t) => t.toLowerCase().includes(query)))
      );
    });
  }
  return filtered;
}

// Send JSON Response Helper
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data, null, 2));
}

// Parse request body helper
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large (1MB limit)'));
      }
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON body: ' + err.message));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Creates an instance of the DevVault API Server.
 * @param {object} options Configuration options
 */
export function createApiServer(options = {}) {
  const dataFile = options.dataFile || DEFAULT_DATA_FILE;
  const configFile = options.configFile || DEFAULT_CONFIG_FILE;

  let port = options.port ?? parseInt(process.env.PORT || '4141', 10);
  let apiKey = options.apiKey ?? process.env.DEVVAULT_API_KEY ?? '';
  let allowWrite = options.allowWrite ?? (process.env.DEVVAULT_ALLOW_WRITE === 'true');

  // Load config file if it exists and values weren't explicitly provided
  if (fs.existsSync(configFile)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      if (cfg.port && options.port === undefined) port = cfg.port;
      if (cfg.apiKey && options.apiKey === undefined) apiKey = cfg.apiKey;
      if (cfg.allowWrite !== undefined && options.allowWrite === undefined) allowWrite = Boolean(cfg.allowWrite);
    } catch {}
  }

  // Load or initialize snippet storage
  function loadSnippets() {
    if (fs.existsSync(dataFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        if (Array.isArray(data) && data.length > 0) return data;
      } catch {}
    }
    // Initialize with default snippets
    try {
      const dir = path.dirname(dataFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dataFile, JSON.stringify(DEFAULT_SNIPPETS, null, 2), 'utf8');
    } catch (e) {
      console.warn('[DevVault] Note: could not write seed snippets to dataFile:', e.message);
    }
    return DEFAULT_SNIPPETS;
  }

  function saveSnippets(snippets) {
    try {
      const dir = path.dirname(dataFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dataFile, JSON.stringify(snippets, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('[DevVault] Error saving snippets:', err.message);
      return false;
    }
  }

  function isAuthorized(req) {
    if (!apiKey) {
      return false;
    }
    const authHeader = req.headers['authorization'] || '';
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim() === apiKey;
    }
    const queryToken = new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams.get('token');
    if (queryToken && queryToken === apiKey) return true;
    return false;
  }

  const server = http.createServer(async (req, res) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const authorized = isAuthorized(req);

    const query = (parsedUrl.searchParams.get('q') || '').toLowerCase().trim();
    const tag = (parsedUrl.searchParams.get('tag') || '').toLowerCase().trim();
    const category = (parsedUrl.searchParams.get('category') || '').toLowerCase().trim();
    const platform = (parsedUrl.searchParams.get('platform') || '').toLowerCase().trim();
    const format = (parsedUrl.searchParams.get('format') || '').toLowerCase().trim();

    // 1. Health & Server Info
    if ((pathname === '/api/health' || pathname === '/api/info') && req.method === 'GET') {
      const snippets = loadSnippets();
      const publicCount = snippets.filter((s) => !s.isPrivate).length;
      const privateCount = snippets.filter((s) => s.isPrivate).length;
      const commands = snippets.filter((s) => s.type === 'command');
      const recipes = snippets.filter((s) => s.type === 'recipe' || (Array.isArray(s.tags) && s.tags.includes('recipe')));

      return sendJson(res, 200, {
        status: 'ok',
        version: '1.2.0',
        name: 'DevVault API Server',
        mode: 'embedded',
        totalSnippets: snippets.length,
        publicSnippets: publicCount,
        privateSnippets: privateCount,
        totalCommands: commands.length,
        publicCommands: commands.filter((c) => !c.isPrivate).length,
        totalRecipes: recipes.length,
        publicRecipes: recipes.filter((r) => !r.isPrivate).length,
        allowWrite,
        requiresAuth: Boolean(apiKey),
      });
    }

    // 2. Stop Server endpoint (Local or Authorized)
    if (pathname === '/api/server/stop' && req.method === 'POST') {
      const isLocalhost = req.socket.remoteAddress === '127.0.0.1' || req.socket.remoteAddress === '::1';
      if (!isLocalhost && !authorized) {
        return sendJson(res, 403, { error: 'Forbidden' });
      }
      sendJson(res, 200, { message: 'Server shutting down' });
      setTimeout(() => {
        server.close();
      }, 100);
      return;
    }

    // 3. Commands Endpoint: GET /api/commands or GET /api/command
    if ((pathname === '/api/commands' || pathname === '/api/command') && req.method === 'GET') {
      const commands = loadSnippets().filter((s) => s.type === 'command');
      const list = filterList(commands, { query, tag, category, platform, authorized });

      if (format === 'raw') {
        res.writeHead(200, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        });
        return res.end(list.map((c) => `# ${c.title}\n${c.content}`).join('\n\n') + '\n');
      }

      return sendJson(res, 200, {
        count: list.length,
        type: 'command',
        authorized,
        commands: list,
      });
    }

    // 4. Raw single command: GET /api/commands/raw/:id
    if (pathname.startsWith('/api/commands/raw/') && req.method === 'GET') {
      const id = pathname.replace('/api/commands/raw/', '').trim();
      const snippets = loadSnippets();
      const item = snippets.find((s) => s.id === id && s.type === 'command');

      if (!item) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        return res.end(`Error: Command '${id}' not found.\n`);
      }

      if (item.isPrivate && !authorized) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        return res.end(`Error: Command '${id}' is private. Provide valid Bearer token authorization.\n`);
      }

      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      return res.end(item.content + '\n');
    }

    // 5. Single command by ID: GET /api/commands/:id
    if ((pathname.startsWith('/api/commands/') || pathname.startsWith('/api/command/')) && req.method === 'GET') {
      const id = pathname.replace(/^\/api\/(commands|command)\//, '').trim();
      const snippets = loadSnippets();
      const item = snippets.find((s) => s.id === id && s.type === 'command');

      if (!item) {
        return sendJson(res, 404, { error: `Command with id '${id}' not found` });
      }

      if (item.isPrivate && !authorized) {
        return sendJson(res, 403, {
          error: 'Forbidden: This command is marked as private. Provide a valid Bearer token.',
        });
      }

      return sendJson(res, 200, item);
    }

    // 6. Create new Command: POST /api/commands or POST /api/command
    if ((pathname === '/api/commands' || pathname === '/api/command') && req.method === 'POST') {
      if (!allowWrite && !authorized) {
        return sendJson(res, 403, { error: 'Forbidden: Writing is disabled or requires authentication token.' });
      }

      try {
        const item = await parseBody(req);
        if (!item.title || !item.content) {
          return sendJson(res, 400, { error: 'Both title and content are required' });
        }

        const snippets = loadSnippets();
        const newCommand = {
          id: item.id || `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: String(item.title),
          content: String(item.content),
          type: 'command',
          language: item.language || 'bash',
          description: item.description || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          category: item.category || 'CLI',
          platform: item.platform || 'all',
          starred: Boolean(item.starred),
          isPrivate: Boolean(item.isPrivate),
          expectedOutput: item.expectedOutput ? String(item.expectedOutput) : undefined,
          executionDuration: item.executionDuration ? String(item.executionDuration) : undefined,
          simulatedPrompt: item.simulatedPrompt ? String(item.simulatedPrompt) : undefined,
          simulatedUser: item.simulatedUser ? String(item.simulatedUser) : undefined,
          simulatedHost: item.simulatedHost ? String(item.simulatedHost) : undefined,
          simulatedCwd: item.simulatedCwd ? String(item.simulatedCwd) : undefined,
          copyCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        snippets.unshift(newCommand);
        saveSnippets(snippets);

        return sendJson(res, 201, {
          message: 'Command created successfully',
          command: newCommand,
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // 7. Recipes Endpoint: GET /api/recipes, GET /api/recipies, or GET /api/recipe
    const isRecipePath = pathname === '/api/recipes' || pathname === '/api/recipies' || pathname === '/api/recipe';
    if (isRecipePath && req.method === 'GET') {
      const recipes = loadSnippets().filter(
        (s) => s.type === 'recipe' || (Array.isArray(s.tags) && s.tags.includes('recipe'))
      );
      const list = filterList(recipes, { query, tag, category, platform, authorized });

      if (format === 'raw') {
        res.writeHead(200, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        });
        return res.end(list.map((r) => `# ${r.title}\n${r.content}`).join('\n\n') + '\n');
      }

      return sendJson(res, 200, {
        count: list.length,
        type: 'recipe',
        authorized,
        recipes: list,
      });
    }

    // 8. Raw single recipe: GET /api/recipes/raw/:id or /api/recipies/raw/:id
    if (pathname.match(/^\/api\/(recipes|recipies|recipe)\/raw\//) && req.method === 'GET') {
      const id = pathname.replace(/^\/api\/(recipes|recipies|recipe)\/raw\//, '').trim();
      const snippets = loadSnippets();
      const item = snippets.find(
        (s) => s.id === id && (s.type === 'recipe' || (Array.isArray(s.tags) && s.tags.includes('recipe')))
      );

      if (!item) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        return res.end(`Error: Recipe '${id}' not found.\n`);
      }

      if (item.isPrivate && !authorized) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        return res.end(`Error: Recipe '${id}' is private. Provide valid Bearer token authorization.\n`);
      }

      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      return res.end(item.content + '\n');
    }

    // 9. Single recipe by ID: GET /api/recipes/:id or /api/recipies/:id
    if (pathname.match(/^\/api\/(recipes|recipies|recipe)\//) && req.method === 'GET') {
      const id = pathname.replace(/^\/api\/(recipes|recipies|recipe)\//, '').trim();
      const snippets = loadSnippets();
      const item = snippets.find(
        (s) => s.id === id && (s.type === 'recipe' || (Array.isArray(s.tags) && s.tags.includes('recipe')))
      );

      if (!item) {
        return sendJson(res, 404, { error: `Recipe with id '${id}' not found` });
      }

      if (item.isPrivate && !authorized) {
        return sendJson(res, 403, {
          error: 'Forbidden: This recipe is marked as private. Provide a valid Bearer token.',
        });
      }

      return sendJson(res, 200, item);
    }

    // 10. Create new Recipe: POST /api/recipes or POST /api/recipies
    if ((pathname === '/api/recipes' || pathname === '/api/recipies' || pathname === '/api/recipe') && req.method === 'POST') {
      if (!allowWrite && !authorized) {
        return sendJson(res, 403, { error: 'Forbidden: Writing is disabled or requires authentication token.' });
      }

      try {
        const item = await parseBody(req);
        if (!item.title || !item.content) {
          return sendJson(res, 400, { error: 'Both title and content are required' });
        }

        const snippets = loadSnippets();
        const newRecipe = {
          id: item.id || `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: String(item.title),
          content: String(item.content),
          type: 'recipe',
          language: item.language || 'bash',
          description: item.description || '',
          tags: Array.isArray(item.tags) ? item.tags : ['recipe'],
          category: item.category || 'Recipes',
          platform: item.platform || 'all',
          starred: Boolean(item.starred),
          isPrivate: Boolean(item.isPrivate),
          expectedOutput: item.expectedOutput ? String(item.expectedOutput) : undefined,
          executionDuration: item.executionDuration ? String(item.executionDuration) : undefined,
          simulatedPrompt: item.simulatedPrompt ? String(item.simulatedPrompt) : undefined,
          simulatedUser: item.simulatedUser ? String(item.simulatedUser) : undefined,
          simulatedHost: item.simulatedHost ? String(item.simulatedHost) : undefined,
          simulatedCwd: item.simulatedCwd ? String(item.simulatedCwd) : undefined,
          copyCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        snippets.unshift(newRecipe);
        saveSnippets(snippets);

        return sendJson(res, 201, {
          message: 'Recipe created successfully',
          recipe: newRecipe,
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // 11. Search Snippets: GET /api/snippets/search
    if (pathname === '/api/snippets/search' && req.method === 'GET') {
      let list = loadSnippets();
      list = filterList(list, { query, tag, category, platform, authorized });

      return sendJson(res, 200, {
        count: list.length,
        query,
        authorized,
        snippets: list,
      });
    }

    // 12. Raw snippet content: GET /api/raw/:id (pipe directly into bash)
    if (pathname.startsWith('/api/raw/') && req.method === 'GET') {
      const id = pathname.replace('/api/raw/', '').trim();
      const snippets = loadSnippets();
      const snippet = snippets.find((s) => s.id === id);

      if (!snippet) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        return res.end(`Error: Snippet '${id}' not found.\n`);
      }

      if (snippet.isPrivate && !authorized) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        return res.end(`Error: Snippet '${id}' is private. Provide valid Bearer token authorization.\n`);
      }

      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });
      return res.end(snippet.content + '\n');
    }

    // 13. List all snippets: GET /api/snippets
    if (pathname === '/api/snippets' && req.method === 'GET') {
      const snippets = loadSnippets();
      const list = filterList(snippets, { query, tag, category, platform, authorized });

      if (format === 'raw') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        return res.end(list.map((s) => `# ${s.title}\n${s.content}`).join('\n\n') + '\n');
      }

      return sendJson(res, 200, {
        count: list.length,
        authorized,
        snippets: list,
      });
    }

    // 14. Get single snippet: GET /api/snippets/:id
    if (pathname.startsWith('/api/snippets/') && req.method === 'GET') {
      const id = pathname.replace('/api/snippets/', '').trim();
      const snippets = loadSnippets();
      const snippet = snippets.find((s) => s.id === id);

      if (!snippet) {
        return sendJson(res, 404, { error: `Snippet with id '${id}' not found` });
      }

      if (snippet.isPrivate && !authorized) {
        return sendJson(res, 403, {
          error: 'Forbidden: This snippet is marked as private. Provide a valid Bearer token.',
        });
      }

      return sendJson(res, 200, snippet);
    }

    // 15. Create new snippet: POST /api/snippets
    if (pathname === '/api/snippets' && req.method === 'POST') {
      if (!allowWrite && !authorized) {
        return sendJson(res, 403, {
          error: 'Forbidden: Writing is disabled or requires authentication token.',
        });
      }

      try {
        const item = await parseBody(req);
        if (!item.title || !item.content) {
          return sendJson(res, 400, { error: 'Both title and content are required' });
        }

        const snippets = loadSnippets();
        const newSnippet = {
          id: item.id || `api-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: String(item.title),
          content: String(item.content),
          type: item.type || 'command',
          language: item.language || 'bash',
          description: item.description || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          category: item.category || 'General',
          platform: item.platform || 'all',
          starred: Boolean(item.starred),
          isPrivate: Boolean(item.isPrivate),
          expectedOutput: item.expectedOutput ? String(item.expectedOutput) : undefined,
          executionDuration: item.executionDuration ? String(item.executionDuration) : undefined,
          simulatedPrompt: item.simulatedPrompt ? String(item.simulatedPrompt) : undefined,
          simulatedUser: item.simulatedUser ? String(item.simulatedUser) : undefined,
          simulatedHost: item.simulatedHost ? String(item.simulatedHost) : undefined,
          simulatedCwd: item.simulatedCwd ? String(item.simulatedCwd) : undefined,
          copyCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        snippets.unshift(newSnippet);
        saveSnippets(snippets);

        return sendJson(res, 201, {
          message: 'Snippet created successfully',
          snippet: newSnippet,
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // 16. Delete snippet: DELETE /api/snippets/:id
    if (pathname.startsWith('/api/snippets/') && req.method === 'DELETE') {
      if (!authorized) {
        return sendJson(res, 403, { error: 'Forbidden: Deleting snippets requires authentication token.' });
      }

      const id = pathname.replace('/api/snippets/', '').trim();
      let snippets = loadSnippets();
      const initialLen = snippets.length;
      snippets = snippets.filter((s) => s.id !== id);

      if (snippets.length === initialLen) {
        return sendJson(res, 404, { error: `Snippet with id '${id}' not found` });
      }

      saveSnippets(snippets);
      return sendJson(res, 200, { message: `Snippet '${id}' deleted successfully` });
    }

    // 17. Remote import endpoint: POST /api/import/remote
    if (pathname === '/api/import/remote' && req.method === 'POST') {
      if (!allowWrite && !authorized) {
        return sendJson(res, 403, { error: 'Forbidden: Writing is disabled or requires authentication token.' });
      }

      try {
        const body = await parseBody(req);
        const remoteUrl = body.remoteUrl ? body.remoteUrl.trim().replace(/\/+$/, '') : null;
        if (!remoteUrl) {
          return sendJson(res, 400, { error: 'remoteUrl is required in request body' });
        }

        const endpointType = body.endpointType || 'all';
        let remotePath = '/api/snippets';
        if (endpointType === 'commands') remotePath = '/api/commands';
        else if (endpointType === 'recipes') remotePath = '/api/recipes';
        else if (endpointType === 'snippets') remotePath = '/api/snippets?type=snippet';

        const target = `${remoteUrl}${remotePath}`;
        const headers = { Accept: 'application/json' };
        if (body.token) headers['Authorization'] = `Bearer ${body.token}`;

        const remoteRes = await fetch(target, { headers });
        if (!remoteRes.ok) {
          return sendJson(res, 502, {
            error: `Remote server error: HTTP ${remoteRes.status} ${remoteRes.statusText}`,
          });
        }

        const remoteData = await remoteRes.json();
        let rawList = [];
        if (Array.isArray(remoteData)) rawList = remoteData;
        else if (Array.isArray(remoteData.snippets)) rawList = remoteData.snippets;
        else if (Array.isArray(remoteData.commands)) rawList = remoteData.commands;
        else if (Array.isArray(remoteData.recipes)) rawList = remoteData.recipes;

        const snippets = loadSnippets();
        let duplicatesSkipped = 0;
        const imported = [];
        const duplicateDetails = [];

        for (const item of rawList) {
          if (!item || !item.title || !item.content) continue;
          const dupCheck = checkDuplicateSnippet(item, snippets);
          if (dupCheck.isDuplicate) {
            duplicatesSkipped++;
            duplicateDetails.push({ title: item.title, reason: dupCheck.reason });
            continue;
          }

          const newId =
            item.id && !snippets.some((s) => s.id === item.id)
              ? item.id
              : `import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

          const tags = Array.isArray(item.tags) ? [...item.tags] : [];
          if (!tags.includes('imported')) tags.push('imported');

          const newSnippet = {
            ...item,
            id: newId,
            tags,
            isPrivate: false,
            copyCount: 0,
            createdAt: item.createdAt || Date.now(),
            updatedAt: Date.now(),
          };

          snippets.unshift(newSnippet);
          imported.push(newSnippet);
        }

        saveSnippets(snippets);

        return sendJson(res, 200, {
          message: `Import completed: ${imported.length} new items imported, ${duplicatesSkipped} duplicates skipped.`,
          scannedCount: rawList.length,
          importedCount: imported.length,
          duplicatesSkipped,
          duplicateDetails,
          imported,
        });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    // 404 Not Found
    return sendJson(res, 404, {
      error: 'Endpoint not found',
      endpoints: [
        'GET /api/health',
        'GET /api/commands',
        'GET /api/commands/:id',
        'GET /api/commands/raw/:id',
        'POST /api/commands',
        'GET /api/recipes',
        'GET /api/recipes/:id',
        'GET /api/recipes/raw/:id',
        'POST /api/recipes',
        'GET /api/snippets',
        'GET /api/snippets/:id',
        'GET /api/snippets/search?q=query&tag=tag&category=cat',
        'GET /api/raw/:id',
        'POST /api/snippets',
        'DELETE /api/snippets/:id',
        'POST /api/import/remote',
      ],
    });
  });

  return {
    server,
    port,
    apiKey,
    allowWrite,
    dataFile,
    configFile,
    listen: (listenPort, listenHost) => {
      const p = listenPort || port;
      const h = listenHost || options.host || '0.0.0.0';
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(p, h, () => {
          server.removeListener('error', reject);
          resolve({ port: p, host: h, url: `http://localhost:${p}` });
        });
      });
    },
    close: () => {
      return new Promise((resolve) => {
        if (!server.listening) return resolve();
        server.close(() => resolve());
      });
    },
    getStatus: () => {
      const snippets = loadSnippets();
      const commands = snippets.filter((s) => s.type === 'command');
      const recipes = snippets.filter((s) => s.type === 'recipe' || (Array.isArray(s.tags) && s.tags.includes('recipe')));
      return {
        status: server.listening ? 'ok' : 'error',
        version: '1.2.0',
        mode: 'embedded',
        running: server.listening,
        port,
        url: `http://localhost:${port}`,
        totalSnippets: snippets.length,
        publicSnippets: snippets.filter((s) => !s.isPrivate).length,
        privateSnippets: snippets.filter((s) => s.isPrivate).length,
        totalCommands: commands.length,
        totalRecipes: recipes.length,
        publicCommands: commands.filter((c) => !c.isPrivate).length,
        publicRecipes: recipes.filter((r) => !r.isPrivate).length,
        allowWrite,
        requiresAuth: Boolean(apiKey),
      };
    },
  };
}

// Global active server instance for programmatic lifecycle management
let activeInstance = null;

export async function startApiServer(options = {}) {
  if (activeInstance) {
    await stopApiServer();
  }
  activeInstance = createApiServer(options);
  const result = await activeInstance.listen(options.port, options.host || '0.0.0.0');
  if (!options.silent) {
    console.log(`\n======================================================`);
    console.log(`🚀 DevVault API Server is running on port ${activeInstance.port}`);
    console.log(`📡 URL: http://localhost:${activeInstance.port}`);
    console.log(`🔒 Authentication: ${activeInstance.apiKey ? 'Enabled (Bearer Token)' : 'Open (Public only without token)'}`);
    console.log(`✍️  Writes Allowed: ${activeInstance.allowWrite ? 'Yes' : 'No'}`);
    console.log(`======================================================\n`);
  }
  return {
    ...result,
    server: activeInstance.server,
    stop: stopApiServer,
    getStatus: getApiServerStatus,
  };
}

export async function stopApiServer() {
  if (!activeInstance) return false;
  await activeInstance.close();
  activeInstance = null;
  return true;
}

export function getApiServerStatus() {
  if (!activeInstance) {
    return { running: false, port: null };
  }
  return activeInstance.getStatus();
}

// Auto-run if executed directly as CLI script
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('apiServer.mjs') || process.argv[1].endsWith('apiServer.js'));

if (isDirectExecution) {
  const cliArgs = process.argv.slice(2);
  let cliPort = undefined;
  let cliApiKey = undefined;
  let cliAllowWrite = undefined;

  for (const arg of cliArgs) {
    if (arg.startsWith('--port=')) {
      cliPort = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--api-key=')) {
      cliApiKey = arg.split('=')[1];
    } else if (arg === '--allow-write') {
      cliAllowWrite = true;
    }
  }

  startApiServer({
    port: cliPort,
    apiKey: cliApiKey,
    allowWrite: cliAllowWrite,
  }).catch((err) => {
    console.error('[DevVault] Fatal error starting API server:', err.message);
    process.exit(1);
  });
}
