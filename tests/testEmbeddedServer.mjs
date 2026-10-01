import assert from 'node:assert';
import {
  startApiServer,
  stopApiServer,
  getApiServerStatus,
} from '../server/apiServer.mjs';

async function runTests() {
  console.log('Testing DevVault Programmatic Embedded API Server Lifecycle...');

  // Test 1: Initially not running
  const initialStatus = getApiServerStatus();
  assert.strictEqual(initialStatus.running, false, 'Server should not be running initially');
  console.log('✔ Test 1 Passed: Initial status reports not running');

  // Test 2: Start server on dynamic test port (51515)
  const testPort = 51515;
  const started = await startApiServer({
    port: testPort,
    silent: true,
    apiKey: 'test-secret-key-123',
    allowWrite: true,
  });

  assert.strictEqual(started.port, testPort, 'Server should listen on assigned test port');
  const runningStatus = getApiServerStatus();
  assert.strictEqual(runningStatus.running, true, 'Server status should report running');
  assert.strictEqual(runningStatus.port, testPort, 'Server status should show test port');
  console.log('✔ Test 2 Passed: Programmatic startApiServer initialized listener on port ' + testPort);

  // Test 3: HTTP Health endpoint check
  const healthRes = await fetch(`http://localhost:${testPort}/api/health`);
  assert.strictEqual(healthRes.status, 200, 'Health endpoint should return 200');
  const healthJson = await healthRes.json();
  assert.strictEqual(healthJson.status, 'ok', 'Health status should be ok');
  assert.strictEqual(healthJson.mode, 'embedded', 'Server mode should be embedded');
  assert.strictEqual(healthJson.requiresAuth, true, 'Authentication requirement should match config');
  console.log('✔ Test 3 Passed: Live HTTP GET /api/health returned valid metadata');

  // Test 4: Programmatic stop
  const stopped = await stopApiServer();
  assert.strictEqual(stopped, true, 'stopApiServer should return true');
  const afterStopStatus = getApiServerStatus();
  assert.strictEqual(afterStopStatus.running, false, 'Server status should report stopped');
  console.log('✔ Test 4 Passed: Programmatic stopApiServer cleanly closed socket');

  // Test 5: Verify port closed
  let connectionRefused = false;
  try {
    await fetch(`http://localhost:${testPort}/api/health`, { signal: AbortSignal.timeout(1000) });
  } catch (err) {
    connectionRefused = true;
  }
  assert.strictEqual(connectionRefused, true, 'Subsequent request to port should fail/refuse');
  console.log('✔ Test 5 Passed: Port was freed after stop');

  console.log('\nAll Embedded API Server programmatic tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Embedded server tests failed:', err);
  process.exit(1);
});
