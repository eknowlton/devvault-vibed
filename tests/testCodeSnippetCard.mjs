import assert from 'node:assert';
import {
  formatAsciiCodeCard,
  formatMarkdownCodeCard,
  generateSvgCodeCard,
  getDefaultFilename,
  IDE_THEMES,
} from '../src/utils/codeSnippetCardFormatter.ts';

console.log('Testing Code Snippet Social Card Formatter...\n');

// Test 1: getDefaultFilename
{
  assert.strictEqual(getDefaultFilename('useDebounce hook', 'typescript'), 'usedebounce-hook.ts');
  assert.strictEqual(getDefaultFilename('Parse JSON Safely', 'python'), 'parse-json-safely.py');
  assert.strictEqual(getDefaultFilename('Query Active Users', 'sql'), 'query-active-users.sql');
  assert.strictEqual(getDefaultFilename('Production Multi-Stage Build', 'dockerfile'), 'Dockerfile');
  console.log('✔ Test 1 Passed: getDefaultFilename generates correct filenames and extensions.');
}

// Test 2: generateSvgCodeCard with syntax highlighting and description
{
  const svg = generateSvgCodeCard({
    title: 'Custom React Debounce Hook',
    description: 'Delays updating value until user stops typing for specified delay period.',
    code: `import { useState, useEffect } from 'react';\n\nexport function useDebounce<T>(value: T, delay: number): T {\n  const [debounced, setDebounced] = useState<T>(value);\n  return debounced;\n}`,
    language: 'typescript',
    theme: 'vscode',
    showLineNumbers: true,
    showBackdrop: true,
  });

  assert(svg.includes('<svg'), 'Should be a valid SVG document');
  assert(svg.includes('Custom React Debounce Hook'), 'Should include snippet title');
  assert(svg.includes('Delays updating value'), 'Should include description docstring');
  assert(svg.includes('usedebounce-hook.ts') || svg.includes('.ts'), 'Should include file tab filename');
  assert(svg.includes('#ff7b72'), 'Should contain keyword highlight color (import/export)');
  assert(svg.includes('DevVault IDE'), 'Should contain status bar branding');
  console.log('✔ Test 2 Passed: generateSvgCodeCard generates rich SVG IDE card with syntax highlighting.');
}

// Test 3: formatAsciiCodeCard
{
  const ascii = formatAsciiCodeCard({
    title: 'PostgreSQL Recursive CTE',
    description: 'Traverses hierarchical organization tree.',
    code: 'WITH RECURSIVE org_tree AS (\n  SELECT id, manager_id FROM employees\n)\nSELECT * FROM org_tree;',
    language: 'sql',
    filename: 'org_tree.sql',
  });

  assert(ascii.includes('org_tree.sql'), 'ASCII should include filename in header');
  assert(ascii.includes('// 💡 PostgreSQL Recursive CTE'), 'ASCII should include title comment');
  assert(ascii.includes('// Traverses hierarchical organization tree.'), 'ASCII should include description');
  assert(ascii.includes('1 │ WITH RECURSIVE org_tree AS ('), 'ASCII should format line numbers');
  console.log('✔ Test 3 Passed: formatAsciiCodeCard generates clean Unicode IDE frame.');
}

// Test 4: formatMarkdownCodeCard
{
  const md = formatMarkdownCodeCard({
    title: 'FastAPI Health Check Route',
    description: 'Basic liveness probe endpoint.',
    code: '@app.get("/health")\ndef health():\n    return {"status": "ok"}',
    language: 'python',
    filename: 'health.py',
  });

  assert(md.includes('📄 FastAPI Health Check Route (health.py)'), 'Markdown should include header with filename');
  assert(md.includes('💡 Basic liveness probe endpoint.'), 'Markdown should include description block');
  assert(md.includes('```python'), 'Markdown should include language codeblock');
  console.log('✔ Test 4 Passed: formatMarkdownCodeCard formats code and documentation metadata.');
}

// Test 5: Themes validation
{
  const themes = Object.keys(IDE_THEMES);
  assert.strictEqual(themes.length, 6, 'Should support 6 IDE themes');

  themes.forEach((t) => {
    const svgTheme = generateSvgCodeCard({
      title: `Testing Theme ${t}`,
      code: 'const x = 42;',
      theme: t,
    });
    assert(svgTheme.includes(IDE_THEMES[t].bg), `Theme ${t} should use its background color`);
  });
  console.log('✔ Test 5 Passed: All 6 IDE themes (VS Code, One Dark, Dracula, Nord, Cyberpunk, Minimal) render accurately.');
}

console.log('\nAll Code Snippet Social Card tests passed successfully!');
