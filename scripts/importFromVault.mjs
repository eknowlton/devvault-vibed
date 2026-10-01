#!/usr/bin/env node
/**
 * CLI Utility to import commands, recipes, and snippets from an external DevVault API.
 * Ensures duplicate entries are detected and skipped.
 *
 * Usage:
 *   node scripts/importFromVault.mjs http://remote-vault:4141
 *   node scripts/importFromVault.mjs http://remote-vault:4141 --type commands
 *   node scripts/importFromVault.mjs http://remote-vault:4141 --token my-secret-token
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '..', 'devvault-data.json');

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
DevVault External API Importer
==============================
Usage:
  node scripts/importFromVault.mjs <server-url> [options]

Options:
  --type <all|commands|recipes|snippets>   Resource type to import (default: all)
  --token <bearer-token>                   API Bearer token for remote server
  --dry-run                                Scan and detect duplicates without saving

Examples:
  node scripts/importFromVault.mjs http://localhost:4141
  node scripts/importFromVault.mjs http://localhost:3000 --type commands
  node scripts/importFromVault.mjs http://192.168.1.50:4141 --token my-token --dry-run
`);
  process.exit(0);
}

const remoteUrlArg = args.find((a) => !a.startsWith('--'));
if (!remoteUrlArg) {
  console.error('Error: Please provide a remote DevVault server URL.');
  process.exit(1);
}

let remoteUrl = remoteUrlArg.trim().replace(/\/+$/, '');
if (!/^https?:\/\//i.test(remoteUrl)) {
  remoteUrl = `http://${remoteUrl}`;
}

let endpointType = 'all';
const typeIdx = args.indexOf('--type');
if (typeIdx !== -1 && args[typeIdx + 1]) {
  endpointType = args[typeIdx + 1];
}

let token = '';
const tokenIdx = args.indexOf('--token');
if (tokenIdx !== -1 && args[tokenIdx + 1]) {
  token = args[tokenIdx + 1];
}

const isDryRun = args.includes('--dry-run');

// Normalization & deduplication helper
function normalizeContent(str) {
  if (!str) return '';
  return str
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')
    .toLowerCase();
}

function checkDuplicate(incoming, existingList) {
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

async function run() {
  console.log(`\n📡 Connecting to DevVault API: ${remoteUrl} (Scope: ${endpointType})`);
  if (token) console.log(`🔒 Using Authentication Bearer Token`);
  if (isDryRun) console.log(`🔍 DRY-RUN MODE: No changes will be written to disk`);

  let remotePath = '/api/snippets';
  if (endpointType === 'commands') remotePath = '/api/commands';
  else if (endpointType === 'recipes') remotePath = '/api/recipes';
  else if (endpointType === 'snippets') remotePath = '/api/snippets?type=snippet';

  const targetUrl = `${remoteUrl}${remotePath}`;
  const headers = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(targetUrl, { headers });
    if (!res.ok) {
      console.error(`❌ HTTP Error ${res.status}: ${res.statusText}`);
      process.exit(1);
    }

    const data = await res.json();
    let rawList = [];
    if (Array.isArray(data)) rawList = data;
    else if (Array.isArray(data.snippets)) rawList = data.snippets;
    else if (Array.isArray(data.commands)) rawList = data.commands;
    else if (Array.isArray(data.recipes)) rawList = data.recipes;

    console.log(`✔ Found ${rawList.length} items from remote vault.\n`);

    // Load local snippets
    let localSnippets = [];
    if (fs.existsSync(DATA_FILE)) {
      try {
        localSnippets = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      } catch {}
    }

    const newItems = [];
    const duplicates = [];

    for (const item of rawList) {
      if (!item || !item.title || !item.content) continue;
      const dup = checkDuplicate(item, localSnippets);
      if (dup.isDuplicate) {
        duplicates.push({ item, reason: dup.reason });
      } else {
        const id =
          item.id && !localSnippets.some((s) => s.id === item.id)
            ? item.id
            : `import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const tags = Array.isArray(item.tags) ? [...item.tags] : [];
        if (!tags.includes('imported')) tags.push('imported');

        newItems.push({
          ...item,
          id,
          tags,
          isPrivate: false,
          copyCount: 0,
          createdAt: item.createdAt || Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    console.log(`------------------------------------------------------`);
    console.log(`📊 DEDUPLICATION SUMMARY:`);
    console.log(`   ✨ New items ready to import: ${newItems.length}`);
    console.log(`   ⚠️  Duplicate items skipped:   ${duplicates.length}`);
    console.log(`------------------------------------------------------\n`);

    if (duplicates.length > 0) {
      console.log(`Skipped Duplicates:`);
      duplicates.forEach(({ item, reason }) => {
        console.log(`  - [SKIPPED] "${item.title}": ${reason}`);
      });
      console.log('');
    }

    if (newItems.length > 0) {
      console.log(`New Items to Import:`);
      newItems.forEach((item) => {
        console.log(`  + [NEW] [${item.type.toUpperCase()}] "${item.title}" (${item.category})`);
      });
      console.log('');
    }

    if (!isDryRun && newItems.length > 0) {
      const merged = [...newItems, ...localSnippets];
      fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2), 'utf8');
      console.log(`🎉 Successfully imported ${newItems.length} items into local vault!`);
    } else if (newItems.length === 0) {
      console.log(`✔ All remote items already exist in your local vault. Nothing to import.`);
    }
  } catch (err) {
    console.error(`❌ Connection failed:`, err.message);
    process.exit(1);
  }
}

run();
