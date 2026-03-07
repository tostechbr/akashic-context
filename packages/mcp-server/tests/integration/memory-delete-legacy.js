#!/usr/bin/env node

// Test memory_delete tool
// Creates a file, deletes it, and verifies protections

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const server = spawn('node', [resolve(__dirname, 'dist/cli.js')], {
  env: {
    ...process.env,
    MEMORY_WORKSPACE_DIR: resolve(__dirname, '../../test-workspace-mcp'),
    OPENAI_API_KEY: 'test-key-for-local-testing'
  },
  stdio: ['pipe', 'pipe', 'inherit']
});

let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();

  const lines = buffer.split('\n');
  buffer = lines.pop();

  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('📨 Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('📝 Raw:', line);
      }
    }
  });
});

// Test 1: Create a temporary file
setTimeout(() => {
  console.log('🧪 Test 1: Create temporary file to delete\n');
  server.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "memory_store",
      arguments: {
        path: "memory/temp-delete-test.md",
        content: "# Temporary File\n\nThis file will be deleted in the test."
      }
    }
  }) + '\n');
}, 2000);

// Test 2: Delete the temporary file
setTimeout(() => {
  console.log('\n🧪 Test 2: Delete the temporary file\n');
  server.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "memory_delete",
      arguments: {
        path: "memory/temp-delete-test.md"
      }
    }
  }) + '\n');
}, 4000);

// Test 3: Try to read the deleted file (should fail)
setTimeout(() => {
  console.log('\n🧪 Test 3: Try to read deleted file (should fail)\n');
  server.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "memory_get",
      arguments: {
        path: "memory/temp-delete-test.md"
      }
    }
  }) + '\n');
}, 6000);

// Test 4: Try to delete MEMORY.md (should fail - protected)
setTimeout(() => {
  console.log('\n🧪 Test 4: Try to delete MEMORY.md (should fail - protected)\n');
  server.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "memory_delete",
      arguments: {
        path: "MEMORY.md"
      }
    }
  }) + '\n');
}, 8000);

// Test 5: Try to delete non-existent file
setTimeout(() => {
  console.log('\n🧪 Test 5: Try to delete non-existent file\n');
  server.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "memory_delete",
      arguments: {
        path: "memory/does-not-exist.md"
      }
    }
  }) + '\n');
}, 10000);

// Close after 12 seconds
setTimeout(() => {
  console.log('\n✅ All tests complete!\n');
  server.stdin.end();
  setTimeout(() => process.exit(0), 500);
}, 12000);

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});
