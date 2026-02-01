#!/bin/bash
# MCP Server wrapper for n8n
# Usage: ./run-server.sh

cd "$(dirname "$0")/../.."

exec node packages/mcp-server/dist/cli.js \
  --workspace=/Users/tiago.santos/Documents/GitHub/memory-context-engine/test-workspace-mcp
