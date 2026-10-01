import assert from 'node:assert';
import {
  extractPlaceholders,
  hasPlaceholders,
  renderTemplate,
} from '../src/utils/templateParser.ts';

console.log('Testing Template Parser Utilities...');

// Test 1: hasPlaceholders detection
assert.strictEqual(hasPlaceholders('git status'), false, 'Should be false when no placeholder');
assert.strictEqual(hasPlaceholders('curl {{URL}}'), true, 'Should be true when simple placeholder');
assert.strictEqual(hasPlaceholders('docker run -p {{PORT:8080}}:80'), true, 'Should be true with default value');
console.log('✔ Test 1 Passed: hasPlaceholders accurately detects parameter presence.');

// Test 2: extractPlaceholders
const rawContent = 'kubectl get secret {{SECRET_NAME:app-secrets}} -n {{NAMESPACE:default}} -o jsonpath="{{PATH}}" {{SECRET_NAME:app-secrets}}';
const extracted = extractPlaceholders(rawContent);

assert.strictEqual(extracted.length, 3, 'Should extract 3 unique placeholders (deduplicating repeats)');
assert.strictEqual(extracted[0].name, 'SECRET_NAME');
assert.strictEqual(extracted[0].defaultValue, 'app-secrets');
assert.strictEqual(extracted[0].raw, '{{SECRET_NAME:app-secrets}}');

assert.strictEqual(extracted[1].name, 'NAMESPACE');
assert.strictEqual(extracted[1].defaultValue, 'default');

assert.strictEqual(extracted[2].name, 'PATH');
assert.strictEqual(extracted[2].defaultValue, '');
console.log('✔ Test 2 Passed: extractPlaceholders parses names, defaults, and deduplicates identical keys.');

// Test 3: renderTemplate with complete values
const rendered = renderTemplate(
  'ssh -i {{KEY_FILE:~/.ssh/id_rsa}} {{USER:root}}@{{HOST:127.0.0.1}} -p {{PORT:22}}',
  {
    KEY_FILE: '/home/dev/.ssh/prod_key',
    USER: 'admin',
    HOST: 'api.production.internal',
    PORT: '2222',
  }
);
assert.strictEqual(
  rendered,
  'ssh -i /home/dev/.ssh/prod_key admin@api.production.internal -p 2222',
  'Should substitute all provided values'
);
console.log('✔ Test 3 Passed: renderTemplate replaces keys with provided user inputs.');

// Test 4: renderTemplate fallback to default values
const renderedFallback = renderTemplate(
  'docker run -d -p {{HOST_PORT:8080}}:{{CONTAINER_PORT:80}} {{IMAGE:nginx:alpine}}',
  {
    HOST_PORT: '3000',
    // CONTAINER_PORT and IMAGE omitted to test default fallbacks
  }
);
assert.strictEqual(
  renderedFallback,
  'docker run -d -p 3000:80 nginx:alpine',
  'Should fall back to default value when parameter omitted'
);
console.log('✔ Test 4 Passed: renderTemplate cleanly falls back to default values when omitted.');

// Test 5: renderTemplate with no defaults
const renderedEmpty = renderTemplate('echo "Target: {{TARGET}}" - Key: {{KEY}}', {
  TARGET: 'production',
});
assert.strictEqual(
  renderedEmpty,
  'echo "Target: production" - Key: ',
  'Should fall back to empty string when no default exists'
);
console.log('✔ Test 5 Passed: renderTemplate cleanly replaces parameters with empty string if no default provided.');

console.log('All Template Parser tests passed successfully!\n');
