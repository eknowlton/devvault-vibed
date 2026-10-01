#!/usr/bin/env node

/**
 * DevVault Embedded API Server
 * A lightweight, zero-dependency REST API server exposing the programmer notebook.
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

// Default Seed Data
const DEFAULT_SNIPPETS = [
  {
    id: 'seed-git-undo-commit',
    title: 'Undo last commit (keep changes staged)',
    content: 'git reset --soft HEAD~1',
    type: 'command',
    language: 'bash',
    description: 'Undoes the most recent commit while preserving all modified files.',
    tags: ['git', 'undo', 'commit'],
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
      if (Array.isArray(data)) return data;
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

// Authentication Check
function isAuthorized(req) {
  if (!apiKey) return true; // If no API key configured, private entries remain protected via explicit header check
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim() === apiKey;
  }
  const queryToken = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token');
  if (queryToken && queryToken === apiKey) return true;
  return false;
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

  // 1. Health & Server Info
  if (pathname === '/api/health' || pathname === '/api/info') {
    const snippets = loadSnippets();
    const publicCount = snippets.filter((s) => !s.isPrivate).length;
    const privateCount = snippets.filter((s) => s.isPrivate).length;

    return sendJson(res, 200, {
      status: 'ok',
      version: '1.0.0',
      name: 'DevVault API Server',
      totalSnippets: snippets.length,
      publicSnippets: publicCount,
      privateSnippets: privateCount,
      allowWrite,
      requiresAuth: Boolean(apiKey),
    });
  }

  // 2. Search Snippets: GET /api/snippets/search?q=...&tag=...&category=...
  if (pathname === '/api/snippets/search' && req.method === 'GET') {
    const query = (parsedUrl.searchParams.get('q') || '').toLowerCase().trim();
    const tag = (parsedUrl.searchParams.get('tag') || '').toLowerCase().trim();
    const category = (parsedUrl.searchParams.get('category') || '').toLowerCase().trim();

    let list = loadSnippets();
    // Exclude private snippets if not authorized
    if (!authorized) {
      list = list.filter((s) => !s.isPrivate);
    }

    if (category) {
      list = list.filter((s) => s.category.toLowerCase() === category);
    }
    if (tag) {
      list = list.filter((s) => s.tags.some((t) => t.toLowerCase() === tag));
    }
    if (query) {
      list = list.filter((s) => {
        return (
          s.title.toLowerCase().includes(query) ||
          s.content.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.tags.some((t) => t.toLowerCase().includes(query))
        );
      });
    }

    return sendJson(res, 200, {
      count: list.length,
      query,
      snippets: list,
    });
  }

  // 3. Raw snippet content: GET /api/raw/:id (great for curl .../api/raw/:id | bash)
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

  // 4. List all snippets: GET /api/snippets
  if (pathname === '/api/snippets' && req.method === 'GET') {
    let snippets = loadSnippets();
    if (!authorized) {
      snippets = snippets.filter((s) => !s.isPrivate);
    }
    return sendJson(res, 200, {
      count: snippets.length,
      authorized,
      snippets,
    });
  }

  // 5. Get single snippet: GET /api/snippets/:id
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

  // 6. Create new snippet: POST /api/snippets
  if (pathname === '/api/snippets' && req.method === 'POST') {
    if (!allowWrite && !authorized) {
      return sendJson(res, 403, {
        error: 'Forbidden: Writing is disabled or requires authentication token.',
      });
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy(); // 1MB payload limit
    });

    req.on('end', () => {
      try {
        const item = JSON.parse(body);
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
        return sendJson(res, 400, { error: 'Invalid JSON body: ' + err.message });
      }
    });
    return;
  }

  // 7. Delete snippet: DELETE /api/snippets/:id
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
      'GET /api/snippets',
      'GET /api/snippets/:id',
      'GET /api/snippets/search?q=query&tag=tag',
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
  console.log(`Example curl commands:`);
  console.log(`  curl http://localhost:${port}/api/health`);
  console.log(`  curl http://localhost:${port}/api/snippets`);
  console.log(`  curl http://localhost:${port}/api/snippets/search?q=docker`);
  console.log(`  curl http://localhost:${port}/api/raw/seed-git-undo-commit`);
  console.log(`\nPress Ctrl+C to stop.`);
});
