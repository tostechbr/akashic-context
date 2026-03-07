#!/usr/bin/env node

// Teste super simples do MCP Server
// Usa stdio para testar localmente

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const server = spawn('node', [resolve(__dirname, 'dist/cli.js')], {
  env: {
    ...process.env,
    MEMORY_WORKSPACE_DIR: resolve(__dirname, '../../examples/test-workspace'),
    OPENAI_API_KEY: 'test-key-for-local-testing'
  },
  stdio: ['pipe', 'pipe', 'inherit'] // stdin, stdout, stderr
});

let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();

  // Processa mensagens JSON completas
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Mantém linha incompleta

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

// Teste 1: Listar tools
console.log('🧪 Test 1: List tools\n');
server.stdin.write(JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list"
}) + '\n');

// Teste 2: Buscar "architecture" após 2 segundos
setTimeout(() => {
  console.log('\n🧪 Test 2: Search for "architecture"\n');
  server.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "memory_search",
      arguments: {
        query: "architecture",
        maxResults: 2
      }
    }
  }) + '\n');
}, 2000);

// Teste 3: Pegar conteúdo de arquivo após 4 segundos
setTimeout(() => {
  console.log('\n🧪 Test 3: Get MEMORY.md content\n');
  server.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "memory_get",
      arguments: {
        path: "MEMORY.md",
        from: 1,
        lines: 5
      }
    }
  }) + '\n');
}, 4000);

// Fechar após 6 segundos
setTimeout(() => {
  console.log('\n✅ Tests complete!\n');
  server.stdin.end();
  setTimeout(() => process.exit(0), 500);
}, 6000);

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});
