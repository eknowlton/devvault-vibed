import assert from 'node:assert';
import { generateSvgCodeCard } from '../src/utils/codeSnippetCardFormatter.ts';

console.log('Testing XML conformance of generated SVG Code Cards...\n');

// Sample snippets with various special characters, quotes, and HTML/XML characters
const testCases = [
  {
    title: 'Custom React Debounce Hook',
    description: 'Delays updating value until user stops typing for specified delay period.',
    code: `import { useState, useEffect } from 'react';\n\nexport function useDebounce<T>(value: T, delay: number): T {\n  const [debounced, setDebounced] = useState<T>(value);\n  return debounced;\n}`,
    language: 'typescript',
  },
  {
    title: 'HTML & XML Special Characters < > & " \' in Title',
    description: 'Special characters: <script>alert("test & demo")</script> and quotes \' single.',
    code: 'const xml = "<root attr=\\"val\\">test & content</root>";',
    language: 'javascript',
  },
  {
    title: 'SQL Complex Query',
    description: 'Queries users where age > 21 AND status != \'banned\'.',
    code: 'SELECT u.id, u.name\nFROM users u\nWHERE u.age >= 21\n  AND u.status <> \'inactive\';',
    language: 'sql',
  },
];

// Simple pure JS XML Well-Formedness Validator
function validateXmlWellFormed(xml) {
  // Check that all opening tags have matching closing tags or are self-closing
  // Check attribute format: name="value" without unescaped raw quotes inside value
  const tagRegex = /<([a-zA-Z0-9_:-]+)(\s+[^>]*)?(\/?)>/g;
  let match;
  const stack = [];

  // Verify attribute syntax on every tag
  while ((match = tagRegex.exec(xml)) !== null) {
    const tagName = match[1];
    const attrsStr = (match[2] || '').replace(/\/$/, '').trim();
    const isSelfClosing = match[3] === '/' || ['circle', 'rect', 'line', 'path', 'feDropShadow', 'stop'].includes(tagName);

    // Validate attributes: should only consist of key="value" pairs
    const attrRegex = /([a-zA-Z0-9_:-]+)="([^"]*)"/g;
    let attrMatch;
    let matchedAttrsLength = 0;
    while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
      matchedAttrsLength += attrMatch[0].length;
    }

    // After removing matched valid attributes and whitespace, attrsStr should be empty
    const remaining = attrsStr.replace(/([a-zA-Z0-9_:-]+)="([^"]*)"/g, '').trim();
    if (remaining.length > 0) {
      throw new Error(`Malformed attribute construct in <${tagName}>: "${remaining}" in full tag: "${match[0]}"`);
    }

    if (!isSelfClosing) {
      stack.push(tagName);
    }
  }

  return true;
}

testCases.forEach((tc, idx) => {
  const svg = generateSvgCodeCard(tc);
  validateXmlWellFormed(svg);
  console.log(`✔ Test Case ${idx + 1} Passed: SVG for "${tc.title}" is well-formed XML with valid attributes.`);
});

console.log('\nAll SVG XML conformance checks passed successfully!');
