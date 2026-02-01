// Simulates how n8n connects to MCP server
import { spawn } from 'node:child_process';

const server = spawn('node', [
  '/Users/tiago.santos/Documents/GitHub/memory-context-engine/packages/mcp-server/dist/cli.js',
  '--workspace=/Users/tiago.santos/Documents/GitHub/memory-context-engine/test-workspace-mcp'
], {
  env: {
    ...process.env,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'mock'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';
let responseCount = 0;

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();
  
  lines.forEach(line => {
    if (line.trim()) {
      responseCount++;
      console.log(`[STDOUT ${responseCount}]`, line);
    }
  });
});

server.stderr.on('data', (data) => {
  console.log('[STDERR]', data.toString().trim());
});

server.on('close', (code) => {
  console.log(`[EXIT] Process exited with code ${code}`);
});

server.on('error', (error) => {
  console.log('[ERROR]', error);
});

// Wait for server to start, then send initialize
setTimeout(() => {
  console.log('\n[SEND] initialize');
  server.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "n8n-test", version: "1.0" }
    }
  }) + '\n');
}, 1000);

// Send tools/list after 3 seconds
setTimeout(() => {
  console.log('\n[SEND] tools/list');
  server.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list"
  }) + '\n');
}, 3000);

// Send memory_search after 5 seconds
setTimeout(() => {
  console.log('\n[SEND] memory_search');
  server.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "memory_search",
      arguments: { query: "Skyfall", minScore: 0 }
    }
  }) + '\n');
}, 5000);

// Close after 8 seconds
setTimeout(() => {
  console.log('\n[TEST] Closing...');
  server.stdin.end();
}, 8000);

// Force exit after 10 seconds
setTimeout(() => {
  console.log('\n[TEST] Force exit');
  process.exit(0);
}, 10000);
