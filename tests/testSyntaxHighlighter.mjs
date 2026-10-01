import assert from 'node:assert';
import { tokenizeLine } from '../src/utils/syntaxHighlighter.ts';

console.log('Testing Syntax Highlighter & Tokenizer Engine...');

// Test 1: Bash commands, flags, and strings
const bashTokens = tokenizeLine('git commit -m "initial commit" --no-verify', 'bash');
assert(bashTokens.length > 0);
const gitToken = bashTokens.find((t) => t.text === 'git');
assert.strictEqual(gitToken?.type, 'command', 'git should be tokenized as a command');

const flagTokens = bashTokens.filter((t) => t.type === 'flag');
assert(flagTokens.some((t) => t.text.includes('-m')));
assert(flagTokens.some((t) => t.text.includes('--no-verify')));

const stringTokens = bashTokens.filter((t) => t.type === 'string');
assert(stringTokens.some((t) => t.text.includes('initial commit')));
console.log('✔ Test 1 Passed: Bash commands, flags, and quoted strings tokenized correctly.');

// Test 2: Shell comments
const commentTokens = tokenizeLine('# This is a critical sysadmin script', 'bash');
const firstToken = commentTokens[0];
assert.strictEqual(firstToken.type, 'comment', 'Full line starting with # should be comment');
console.log('✔ Test 2 Passed: Shell comment lines identified accurately.');

// Test 3: Template placeholders
const placeholderTokens = tokenizeLine('docker run -p {{PORT:8080}}:80 {{IMAGE_NAME}}', 'bash');
const placeholders = placeholderTokens.filter((t) => t.type === 'placeholder');
assert.strictEqual(placeholders.length, 2, 'Should detect both placeholders');
assert(placeholders.some((t) => t.text === '{{PORT:8080}}'));
assert(placeholders.some((t) => t.text === '{{IMAGE_NAME}}'));
console.log('✔ Test 3 Passed: {{PARAM}} placeholders identified as placeholder tokens.');

// Test 4: TypeScript / JavaScript keywords and functions
const tsTokens = tokenizeLine('export async function fetchData(url: string): Promise<Response> { return fetch(url); }', 'typescript');
const exportToken = tsTokens.find((t) => t.text === 'export');
assert.strictEqual(exportToken?.type, 'keyword', 'export should be a keyword');
const functionToken = tsTokens.find((t) => t.text === 'function');
assert.strictEqual(functionToken?.type, 'keyword', 'function should be a keyword');
console.log('✔ Test 4 Passed: TypeScript keywords and constructs tokenized correctly.');

// Test 5: Python keywords and comments
const pyComment = tokenizeLine('# Python helper', 'python');
assert.strictEqual(pyComment[0].type, 'comment');
const pyDef = tokenizeLine('def calculate_sum(a, b):', 'python');
assert(pyDef.some((t) => t.text === 'def' && t.type === 'keyword'));
console.log('✔ Test 5 Passed: Python syntax definitions and comments tokenized accurately.');

// Test 6: SQL keywords
const sqlTokens = tokenizeLine('SELECT id, name FROM users WHERE active = 1 ORDER BY created_at DESC;', 'sql');
assert(sqlTokens.some((t) => t.text.toUpperCase() === 'SELECT' && t.type === 'keyword'));
assert(sqlTokens.some((t) => t.text.toUpperCase() === 'FROM' && t.type === 'keyword'));
assert(sqlTokens.some((t) => t.text.toUpperCase() === 'WHERE' && t.type === 'keyword'));
console.log('✔ Test 6 Passed: SQL keywords recognized.');

console.log('All Syntax Highlighter tests passed successfully!\n');
