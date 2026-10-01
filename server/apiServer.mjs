#!/usr/bin/env node

/**
 * DevVault Embedded API Server
 * A lightweight, zero-dependency REST API server exposing the programmer notebook.
 * Features dedicated endpoints for commands, recipes, and snippets.
 * Respects public vs private entry visibility and supports token authentication.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'devvault-data.json');
const CONFIG_FILE = path.join(__dirname, '..', 'server-config.json');

// Default Seed Data Fallback
const DEFAULT_SNIPPETS = [
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

// CLI Arguments Parser
const args = process.argv.slice(2);
let port = parseInt(process.env.PORT || '4141', 10);
let apiKey = process.env.DEVVAULT_API_KEY || '';
let allowWrite = process.env.DEVVAULT_ALLOW_WRITE === 'true';

for (const arg of args) {
  if (arg.startsWith('--port=')) {
    port = parseInt(arg.split('=')[1], 10) || port;
  } else if (arg.startsWith('--api-key=')) {
    apiKey = arg.split('=')[1] || apiKey;
  } else if (arg === '--allow-write') {
    allowWrite = true;
  }
}

// Read config file if exists
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (cfg.port && !args.some((a) => a.startsWith('--port='))) port = cfg.port;
    if (cfg.apiKey && !apiKey) apiKey = cfg.apiKey;
    if (cfg.allowWrite !== undefined && !args.includes('--allow-write')) allowWrite = Boolean(cfg.allowWrite);
  } catch (err) {
    console.warn('[DevVault] Failed to read server-config.json:', err.message);
  }
}

// Load or initialize snippet storage
function loadSnippets() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (err) {
      console.warn('[DevVault] Failed to read devvault-data.json, using fallback:', err.message);
    }
  }
  // Initialize with seed data
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_SNIPPETS, null, 2), 'utf8');
  } catch {}
  return DEFAULT_SNIPPETS;
}

function saveSnippets(snippets) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(snippets, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[DevVault] Error saving snippets:', err.message);
    return false;
  }
}

// Authentication Check (Private entries require a valid API token)
function isAuthorized(req) {
  if (!apiKey) {
    // If no API key is configured on the server, private items cannot be unlocked
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

// Helper: Filter list by query, tags, category, platform, privacy
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

// Create HTTP Server
const server = http.createServer(async (req, res) => {
  // Handle CORS Preflight
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

  // 1. Health & Server Info: GET /api/health or /api/info
  if ((pathname === '/api/health' || pathname === '/api/info') && req.method === 'GET') {
    const snippets = loadSnippets();
    const publicCount = snippets.filter((s) => !s.isPrivate).length;
    const privateCount = snippets.filter((s) => s.isPrivate).length;

    const commands = snippets.filter((s) => s.type === 'command');
    const recipes = snippets.filter((s) => s.type === 'recipe' || (Array.isArray(s.tags) && s.tags.includes('recipe')));

    return sendJson(res, 200, {
      status: 'ok',
      version: '1.1.0',
      name: 'DevVault API Server',
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

  // 2. Commands Endpoint: GET /api/commands or GET /api/command
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

  // 3. Raw single command: GET /api/commands/raw/:id
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

  // 4. Single command by ID: GET /api/commands/:id
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

  // 5. Create new Command: POST /api/commands or POST /api/command
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

  // 6. Recipes Endpoint: GET /api/recipes, GET /api/recipies, or GET /api/recipe
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

  // 7. Raw single recipe: GET /api/recipes/raw/:id or /api/recipies/raw/:id
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

  // 8. Single recipe by ID: GET /api/recipes/:id or /api/recipies/:id
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

  // 9. Create new Recipe: POST /api/recipes or POST /api/recipies
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

  // 10. Search Snippets: GET /api/snippets/search
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

  // 11. Raw snippet content: GET /api/raw/:id (pipe directly into bash)
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

  // 12. List all snippets: GET /api/snippets
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

  // 13. Get single snippet: GET /api/snippets/:id
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

  // 14. Create new snippet: POST /api/snippets
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

  // 15. Delete snippet: DELETE /api/snippets/:id
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
    ],
  });
});

server.listen(port, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 DevVault API Server is running on port ${port}`);
  console.log(`📡 URL: http://localhost:${port}`);
  console.log(`🔒 Authentication: ${apiKey ? 'Enabled (Bearer Token)' : 'Open (Public only without token)'}`);
  console.log(`✍️  Writes Allowed: ${allowWrite ? 'Yes' : 'No'}`);
  console.log(`======================================================\n`);
  console.log(`Available Endpoints:`);
  console.log(`  Commands: curl http://localhost:${port}/api/commands`);
  console.log(`  Recipes:  curl http://localhost:${port}/api/recipes`);
  console.log(`  Snippets: curl http://localhost:${port}/api/snippets`);
  console.log(`  Search:   curl http://localhost:${port}/api/snippets/search?q=docker`);
  console.log(`  Raw Exec: curl http://localhost:${port}/api/raw/seed-git-undo-commit | bash`);
  console.log(`\nPress Ctrl+C to stop.`);
});
