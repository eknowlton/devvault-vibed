import assert from 'node:assert';
import {
  extractCommentLines,
  formatAsciiTerminalCard,
  formatMarkdownTerminal,
  generateSvgTerminalCard,
} from '../src/utils/terminalCardFormatter.ts';

console.log('Testing Terminal Card Formatter with Comments...\n');

// Test 1: extractCommentLines
{
  const empty = extractCommentLines('');
  assert.strictEqual(empty.length, 0);

  const normalized = extractCommentLines('Clean up dangling docker images');
  assert.deepStrictEqual(normalized, ['# Clean up dangling docker images']);

  const alreadyComment = extractCommentLines('# Already commented\n# Second line');
  assert.deepStrictEqual(alreadyComment, ['# Already commented', '# Second line']);

  console.log('✔ Test 1 Passed: extractCommentLines correctly prefixes and normalizes comment lines.');
}

// Test 2: formatAsciiTerminalCard
{
  const card = formatAsciiTerminalCard({
    username: 'ethan',
    hostname: 'devvault',
    cwd: '~',
    promptSymbol: '$',
    command: 'docker system prune -af',
    output: 'Deleted Containers: 4a29c1b3f940\nTotal reclaimed space: 4.82GB',
    comment: 'Reclaim disk space by pruning containers',
  });

  assert(card.includes('# Reclaim disk space by pruning containers'), 'Card should contain comment line');
  assert(card.includes('$ docker system prune -af'), 'Card should contain command line');
  assert(card.includes('Total reclaimed space: 4.82GB'), 'Card should contain output');
  console.log('✔ Test 2 Passed: formatAsciiTerminalCard renders shell comment inside box above prompt.');
}

// Test 3: formatMarkdownTerminal
{
  const md = formatMarkdownTerminal({
    username: 'root',
    hostname: 'prod-api-01',
    cwd: '/etc',
    promptSymbol: '#',
    command: 'systemctl restart nginx',
    output: '✔ Service reloaded.',
    comment: 'Restart web proxy after updating certificates',
  });

  assert(md.includes('# Restart web proxy after updating certificates'), 'Markdown should contain comment');
  assert(md.includes('root@prod-api-01:/etc# systemctl restart nginx'), 'Markdown should contain prompt and command');
  console.log('✔ Test 3 Passed: formatMarkdownTerminal formats comment as bash comment block.');
}

// Test 4: generateSvgTerminalCard
{
  const svg = generateSvgTerminalCard({
    username: 'ubuntu',
    hostname: 'aws-ec2',
    cwd: '~/app',
    promptSymbol: '$',
    command: 'git pull origin main',
    output: 'Already up to date.',
    comment: 'Sync latest deployment bundle',
  });

  assert(svg.includes('Sync latest deployment bundle'), 'SVG should contain comment text');
  assert(svg.includes('font-style="italic"'), 'SVG should style comment in italic');
  console.log('✔ Test 4 Passed: generateSvgTerminalCard includes italic SVG comment text.');
}

console.log('\nAll terminal comment tests passed successfully!');
