#!/usr/bin/env node

/**
 * DevVault Unified Test Suite Runner
 * Executes all unit and integration test suites and reports results.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const testSuites = [
  { name: 'Template Parameter Parser', file: 'tests/testTemplateParser.mjs' },
  { name: 'Search & Relevance Engine', file: 'tests/testSearchEngine.mjs' },
  { name: 'Syntax Highlighting Tokenizer', file: 'tests/testSyntaxHighlighter.mjs' },
  { name: 'DevVault Importer & Deduplication', file: 'tests/testImporter.mjs' },
  { name: 'Terminal Cards & Shell Comments', file: 'tests/testTerminalComment.mjs' },
  { name: 'Terminal Emulator Type Guard', file: 'tests/testEmulatorTypeGuard.mjs' },
  { name: 'IDE Code Snippet Social Cards', file: 'tests/testCodeSnippetCard.mjs' },
  { name: 'SVG Card XML Well-Formedness', file: 'tests/validateSvgXml.mjs' },
  { name: 'Programmatic Embedded API Server', file: 'tests/testEmbeddedServer.mjs' },
  { name: 'App-Wide Environments & Variables', file: 'tests/testEnvironmentVariables.mjs' },
  { name: 'Electron Window & Menu Bar Config', file: 'tests/testElectronWindowConfig.mjs' },
];

async function runSuite(suite) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const proc = spawn(
      process.execPath,
      ['--loader', './tests/ts-loader.mjs', '--experimental-strip-types', suite.file],
      {
        cwd: rootDir,
        env: { ...process.env, FORCE_COLOR: '1' },
      }
    );

    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      const duration = Date.now() - startTime;
      resolve({
        name: suite.name,
        file: suite.file,
        passed: code === 0,
        code,
        duration,
        output,
        errorOutput,
      });
    });
  });
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`🧪 Running DevVault Test Suite (${testSuites.length} test suites)`);
  console.log(`======================================================\n`);

  const results = [];
  let allPassed = true;

  for (const suite of testSuites) {
    process.stdout.write(`• Running: ${suite.name}... `);
    const result = await runSuite(suite);
    results.push(result);

    if (result.passed) {
      console.log(`\x1b[32mPASSED\x1b[0m (${result.duration}ms)`);
    } else {
      console.log(`\x1b[31mFAILED\x1b[0m (${result.duration}ms)`);
      console.error(`\n--- FAILURE OUTPUT FOR: ${suite.name} ---`);
      console.error(result.output);
      console.error(result.errorOutput);
      console.error(`-----------------------------------------\n`);
      allPassed = false;
    }
  }

  console.log(`\n======================================================`);
  console.log(`📊 TEST EXECUTION SUMMARY`);
  console.log(`======================================================`);
  for (const r of results) {
    const icon = r.passed ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✖\x1b[0m';
    console.log(`${icon} ${r.name.padEnd(36)} [${r.duration}ms]`);
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\nTotal: ${results.length} | Passed: ${passedCount} | Failed: ${results.length - passedCount}`);
  console.log(`======================================================\n`);

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
