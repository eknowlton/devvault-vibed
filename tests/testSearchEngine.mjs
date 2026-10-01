import assert from 'node:assert';
import { filterAndSortSnippets } from '../src/utils/searchEngine.ts';

console.log('Testing Search Engine & Filter Engine...');

const SAMPLE_SNIPPETS = [
  {
    id: 'git-undo',
    title: 'Undo last git commit',
    content: 'git reset --soft HEAD~1',
    type: 'command',
    language: 'bash',
    description: 'Undoes the most recent commit while preserving all modified files.',
    tags: ['git', 'undo', 'commit'],
    category: 'Git',
    platform: 'all',
    starred: true,
    isPrivate: false,
    copyCount: 50,
    createdAt: 1000,
    updatedAt: 2000,
  },
  {
    id: 'docker-prune',
    title: 'Docker prune everything',
    content: 'docker system prune -a --volumes -f',
    type: 'command',
    language: 'bash',
    description: 'Removes all stopped containers, networks, and images.',
    tags: ['docker', 'cleanup', 'prune'],
    category: 'Docker',
    platform: 'linux',
    starred: false,
    isPrivate: false,
    copyCount: 20,
    createdAt: 1000,
    updatedAt: 1500,
  },
  {
    id: 'k8s-secret',
    title: 'Decode base64 k8s secret',
    content: 'kubectl get secret my-secret -o yaml',
    type: 'command',
    language: 'bash',
    description: 'Kubernetes secret inspection.',
    tags: ['k8s', 'secret', 'kubernetes'],
    category: 'Kubernetes',
    platform: 'all',
    starred: true,
    isPrivate: true,
    copyCount: 10,
    createdAt: 1000,
    updatedAt: 3000,
  },
  {
    id: 'curl-timing',
    title: 'Curl HTTP latency timing recipe',
    content: 'curl -w "@-" -o /dev/null -s "https://api.github.com"',
    type: 'recipe',
    language: 'bash',
    description: 'Measures DNS and TLS handshake latency.',
    tags: ['curl', 'network', 'http', 'performance'],
    category: 'Network',
    platform: 'all',
    starred: false,
    isPrivate: false,
    copyCount: 5,
    createdAt: 500,
    updatedAt: 500,
  },
  {
    id: 'react-debounce',
    title: 'Custom React Debounce Hook',
    content: 'export function useDebounce(value, delay) { ... }',
    type: 'snippet',
    language: 'typescript',
    description: 'React custom hook for input debouncing.',
    tags: ['react', 'hook', 'frontend'],
    category: 'React',
    platform: 'all',
    starred: true,
    isPrivate: false,
    copyCount: 30,
    createdAt: 800,
    updatedAt: 1200,
  },
];

const defaultFilters = {
  query: '',
  selectedCategory: null,
  selectedTag: null,
  typeFilter: 'all',
  platformFilter: 'all',
  starredOnly: false,
  visibilityFilter: 'all',
  sortBy: 'recentlyUpdated',
};

// Test 1: Full-text query token search
const searchDocker = filterAndSortSnippets(SAMPLE_SNIPPETS, {
  ...defaultFilters,
  query: 'docker',
});
assert.strictEqual(searchDocker.length, 1);
assert.strictEqual(searchDocker[0].id, 'docker-prune');
console.log('✔ Test 1 Passed: Simple keyword search matches title and content.');

// Test 2: Multi-token query search
const searchMulti = filterAndSortSnippets(SAMPLE_SNIPPETS, {
  ...defaultFilters,
  query: 'git commit undo',
});
assert.strictEqual(searchMulti.length, 1);
assert.strictEqual(searchMulti[0].id, 'git-undo');
console.log('✔ Test 2 Passed: Multi-token search requires all tokens.');

// Test 3: Tag search with # prefix
const searchTag = filterAndSortSnippets(SAMPLE_SNIPPETS, {
  ...defaultFilters,
  query: '#kubernetes',
});
assert.strictEqual(searchTag.length, 1);
assert.strictEqual(searchTag[0].id, 'k8s-secret');
console.log('✔ Test 3 Passed: Search strips leading # for hashtags.');

// Test 4: Type filtering (commands vs recipes vs snippets)
const commandsOnly = filterAndSortSnippets(SAMPLE_SNIPPETS, {
  ...defaultFilters,
  typeFilter: 'command',
});
assert.strictEqual(commandsOnly.length, 3);
assert(commandsOnly.every((s) => s.type === 'command'));

const recipesOnly = filterAndSortSnippets(SAMPLE_SNIPPETS, {
  ...defaultFilters,
  typeFilter: 'recipe',
});
assert.strictEqual(recipesOnly.length, 1);
assert.strictEqual(recipesOnly[0].id, 'curl-timing');
console.log('✔ Test 4 Passed: Type filter isolates commands, recipes, and code snippets.');

// Test 5: Visibility filtering (public vs private)
const publicOnly = filterAndSortSnippets(SAMPLE_SNIPPETS, {
  ...defaultFilters,
  visibilityFilter: 'public',
});
assert.strictEqual(publicOnly.length, 4);
assert(publicOnly.every((s) => !s.isPrivate));

const privateOnly = filterAndSortSnippets(SAMPLE_SNIPPETS, {
  ...defaultFilters,
  visibilityFilter: 'private',
});
assert.strictEqual(privateOnly.length, 1);
assert.strictEqual(privateOnly[0].id, 'k8s-secret');
console.log('✔ Test 5 Passed: Visibility filter separates public from private snippets.');

// Test 6: Platform filtering
const macosFiltered = filterAndSortSnippets(SAMPLE_SNIPPETS, {
  ...defaultFilters,
  platformFilter: 'macos',
});
// Items with platform === 'all' or 'macos' match
assert.strictEqual(macosFiltered.length, 4);
assert(!macosFiltered.some((s) => s.id === 'docker-prune')); // docker-prune is platform: 'linux'
console.log('✔ Test 6 Passed: Platform filter excludes foreign platforms while keeping universal entries.');

// Test 7: Starred filter
const starredOnly = filterAndSortSnippets(SAMPLE_SNIPPETS, {
  ...defaultFilters,
  starredOnly: true,
});
assert.strictEqual(starredOnly.length, 3);
assert(starredOnly.every((s) => s.starred));
console.log('✔ Test 7 Passed: Starred-only filter isolates favorites.');

// Test 8: Sorting modes
const sortedByCopies = filterAndSortSnippets(SAMPLE_SNIPPETS, {
  ...defaultFilters,
  sortBy: 'mostCopied',
});
assert.strictEqual(sortedByCopies[0].id, 'git-undo'); // 50 copies
assert.strictEqual(sortedByCopies[1].id, 'react-debounce'); // 30 copies
console.log('✔ Test 8 Passed: Sorting by mostCopied accurately orders results descending.');

console.log('All Search Engine tests passed successfully!\n');
