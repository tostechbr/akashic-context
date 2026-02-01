#!/bin/bash

# Test MCP Server locally via stdio
# Usage: ./test-local.sh

cd "$(dirname "$0")"

export MEMORY_WORKSPACE_DIR=../../examples/test-workspace
export OPENAI_API_KEY=${OPENAI_API_KEY:-mock-key}

echo "🧪 Testing MCP Server..."
echo ""

# Test 1: List tools
echo "📋 Test 1: List available tools"
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/cli.js 2>/dev/null | jq '.'
echo ""

# Test 2: Search for "architecture"
echo "🔍 Test 2: Search for 'architecture'"
cat <<EOF | node dist/cli.js 2>/dev/null | jq '.'
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"memory_search","arguments":{"query":"architecture","maxResults":3}}}
EOF
echo ""

# Test 3: Get file content
echo "📄 Test 3: Get file content (first 10 lines of MEMORY.md)"
cat <<EOF | node dist/cli.js 2>/dev/null | jq '.'
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"memory_get","arguments":{"path":"MEMORY.md","from":1,"lines":10}}}
EOF
echo ""

echo "✅ Tests complete!"
