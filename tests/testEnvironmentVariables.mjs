import assert from 'node:assert';
import {
  extractPlaceholders,
  getResolvedParameters,
  renderTemplate,
  resolveParameter,
} from '../src/utils/templateParser.ts';
import { SEED_ENVIRONMENTS } from '../src/storage/environmentStorage.ts';

console.log('Testing App-Wide Environment Variable Utilities...');

// Test 1: Seed Environments integrity
assert.strictEqual(Array.isArray(SEED_ENVIRONMENTS), true, 'SEED_ENVIRONMENTS should be an array');
assert.strictEqual(SEED_ENVIRONMENTS.length >= 3, true, 'SEED_ENVIRONMENTS should include Dev, Staging, Prod');

const devEnv = SEED_ENVIRONMENTS.find((e) => e.name === 'Development');
const stagingEnv = SEED_ENVIRONMENTS.find((e) => e.name === 'Staging');
const prodEnv = SEED_ENVIRONMENTS.find((e) => e.name === 'Production');

assert.ok(devEnv, 'Development environment should exist');
assert.ok(stagingEnv, 'Staging environment should exist');
assert.ok(prodEnv, 'Production environment should exist');

assert.strictEqual(devEnv.variables.PORT, '3000');
assert.strictEqual(stagingEnv.variables.PORT, '8080');
assert.strictEqual(prodEnv.variables.PORT, '443');
console.log('✔ Test 1 Passed: Seed environments (Dev, Staging, Prod) have valid configurations and variables.');

// Test 2: Parameter Resolution Hierarchy (User Override > Environment > Snippet Default > Empty)
// Case A: User override takes highest precedence
const resUser = resolveParameter(
  'PORT',
  '8080',
  { PORT: '9999' },
  { PORT: '3000' },
  'Development'
);
assert.strictEqual(resUser.value, '9999');
assert.strictEqual(resUser.source, 'user');

// Case B: Environment takes precedence over default when user override is absent
const resEnv = resolveParameter(
  'PORT',
  '8080',
  {},
  { PORT: '3000' },
  'Development'
);
assert.strictEqual(resEnv.value, '3000');
assert.strictEqual(resEnv.source, 'environment');
assert.strictEqual(resEnv.environmentName, 'Development');

// Case C: Snippet inline default used when variable is missing from environment
const resDefault = resolveParameter(
  'CUSTOM_TIMEOUT',
  '30s',
  {},
  { PORT: '3000' },
  'Development'
);
assert.strictEqual(resDefault.value, '30s');
assert.strictEqual(resDefault.source, 'default');

// Case D: Empty fallback when no user, env, or default is defined
const resEmpty = resolveParameter('UNSET_FLAG', '', {}, {}, 'Development');
assert.strictEqual(resEmpty.value, '');
assert.strictEqual(resEmpty.source, 'empty');
console.log('✔ Test 2 Passed: resolveParameter honors strict precedence (User > Env > Default > Empty).');

// Test 3: Environment Switching in renderTemplate
const templateStr =
  'kubectl port-forward deployment/{{DEPLOYMENT_NAME:api-service}} {{LOCAL_PORT:8080}}:{{POD_PORT:80}} -n {{NAMESPACE:default}}';

// Render with Development environment variables
const renderedDev = renderTemplate(templateStr, {}, devEnv.variables);
assert.strictEqual(
  renderedDev,
  'kubectl port-forward deployment/api-dev 3000:80 -n dev',
  'Should resolve DEPLOYMENT_NAME, LOCAL_PORT, and NAMESPACE from devEnv while falling back POD_PORT to 80'
);

// Switch and render with Production environment variables
const renderedProd = renderTemplate(templateStr, {}, prodEnv.variables);
assert.strictEqual(
  renderedProd,
  'kubectl port-forward deployment/api-prod 443:80 -n production',
  'Should resolve DEPLOYMENT_NAME, LOCAL_PORT, and NAMESPACE from prodEnv'
);

// Switch and render with Staging environment variables
const renderedStaging = renderTemplate(templateStr, {}, stagingEnv.variables);
assert.strictEqual(
  renderedStaging,
  'kubectl port-forward deployment/api-staging 8080:80 -n staging',
  'Should resolve DEPLOYMENT_NAME, LOCAL_PORT, and NAMESPACE from stagingEnv'
);
console.log('✔ Test 3 Passed: renderTemplate accurately transforms commands according to active environment profiles.');

// Test 4: User Override combined with Environment Profile
const renderedUserOverride = renderTemplate(
  templateStr,
  { LOCAL_PORT: '5555', POD_PORT: '9000' },
  prodEnv.variables
);
assert.strictEqual(
  renderedUserOverride,
  'kubectl port-forward deployment/api-prod 5555:9000 -n production',
  'User inputs should selectively override environment variables while keeping remaining env values'
);
console.log('✔ Test 4 Passed: User inputs cleanly overlay active environment variables.');

// Test 5: getResolvedParameters inspection
const placeholders = extractPlaceholders(templateStr);
const resolvedList = getResolvedParameters(
  placeholders,
  { LOCAL_PORT: '7777' },
  devEnv.variables,
  'Development'
);

assert.strictEqual(resolvedList.length, 4);
const depRes = resolvedList.find((r) => r.name === 'DEPLOYMENT_NAME');
assert.strictEqual(depRes.source, 'environment');
assert.strictEqual(depRes.value, 'api-dev');

const portRes = resolvedList.find((r) => r.name === 'LOCAL_PORT');
assert.strictEqual(portRes.source, 'user');
assert.strictEqual(portRes.value, '7777');

const podPortRes = resolvedList.find((r) => r.name === 'POD_PORT');
assert.strictEqual(podPortRes.source, 'default');
assert.strictEqual(podPortRes.value, '80');

console.log('✔ Test 5 Passed: getResolvedParameters accurately classifies sources (user, environment, default).');

console.log('All Environment Variable tests passed successfully!\n');
