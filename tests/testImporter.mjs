import http from 'http';
import assert from 'assert';

// 1. Deduplication unit test logic
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

console.log('Running DevVault Importer Unit Tests...');

const existingList = [
  {
    id: 'git-undo',
    title: 'Undo Last Git Commit (Keep Changes)',
    content: 'git reset --soft HEAD~1',
    type: 'command',
  },
  {
    id: 'docker-prune',
    title: 'Docker System Prune Deep Clean',
    content: 'docker system prune -a --volumes -f',
    type: 'command',
  },
];

// Test 1: Exact ID match
const test1 = checkDuplicate({ id: 'git-undo', title: 'Something Else', content: 'ls -la' }, existingList);
assert.strictEqual(test1.isDuplicate, true, 'Test 1 failed: Should catch duplicate ID');
console.log('✔ Test 1 Passed: Detected exact ID duplicate.');

// Test 2: Identical command content with different ID and whitespace
const test2 = checkDuplicate(
  { id: 'random-123', title: 'Undo Commit', content: '  git reset --soft HEAD~1\n\n' },
  existingList
);
assert.strictEqual(test2.isDuplicate, true, 'Test 2 failed: Should catch identical content with whitespace differences');
console.log('✔ Test 2 Passed: Detected identical command code content.');

// Test 3: Brand new item
const test3 = checkDuplicate(
  { id: 'k8s-get-pods', title: 'Get All Pods in Namespace', content: 'kubectl get pods -n kube-system' },
  existingList
);
assert.strictEqual(test3.isDuplicate, false, 'Test 3 failed: Should not flag unique command as duplicate');
console.log('✔ Test 3 Passed: Verified unique new command is not flagged.');

// Test 4: Same title but completely different content
const test4 = checkDuplicate(
  { id: 'git-undo-hard', title: 'Undo Last Git Commit (Keep Changes)', content: 'git reset --hard HEAD~1' },
  existingList
);
assert.strictEqual(test4.isDuplicate, false, 'Test 4 failed: Different command content should be accepted');
console.log('✔ Test 4 Passed: Allowed different content even with similar title.');

// Test 5: HTTP Mock Server Integration Test
const mockServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  if (req.url === '/api/snippets') {
    res.end(
      JSON.stringify({
        count: 3,
        snippets: [
          { id: 'git-undo', title: 'Undo Last Git Commit', content: 'git reset --soft HEAD~1', type: 'command' },
          { id: 'new-k8s', title: 'Kubernetes Scale Deployment', content: 'kubectl scale deploy app --replicas=5', type: 'command' },
          { id: 'new-recipe', title: 'Deploy Clean Staging Stack', content: 'docker compose down -v && docker compose up -d --build', type: 'recipe' },
        ],
      })
    );
  } else {
    res.end(JSON.stringify({ count: 0, snippets: [] }));
  }
});

mockServer.listen(0, async () => {
  const port = mockServer.address().port;
  console.log(`\nTesting HTTP Mock Server on port ${port}...`);

  const response = await fetch(`http://localhost:${port}/api/snippets`);
  const data = await response.json();
  assert.strictEqual(data.count, 3);

  let newCount = 0;
  let dupCount = 0;

  for (const item of data.snippets) {
    const dup = checkDuplicate(item, existingList);
    if (dup.isDuplicate) dupCount++;
    else newCount++;
  }

  assert.strictEqual(dupCount, 1, 'Should find exactly 1 duplicate (git-undo)');
  assert.strictEqual(newCount, 2, 'Should find exactly 2 new items (new-k8s, new-recipe)');
  console.log('✔ Test 5 Passed: HTTP mock server returned 3 items -> 1 duplicate skipped, 2 new items detected.');

  mockServer.close();
  console.log('\nAll unit & integration tests passed successfully!\n');
});
