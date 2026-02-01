# Project Memory

## 2026-01-31: Memory Context Engine Development

Today we worked on the Memory Context Engine project:

- Fixed critical SQLite FTS5 UPSERT compatibility issue
- Compiled better-sqlite3 native module for M1 Mac
- Improved test pass rate from 52% to 97.7% (86/88 tests passing)
- Created MCP Server adapter for cloud agent integration

### Technical Details

The core memory system uses:
- Hybrid search: 70% vector + 30% keyword (BM25)
- SQLite with FTS5 and sqlite-vec extensions
- Chunking with 400 token size and 80 token overlap
- OpenAI embeddings (text-embedding-3-small)

### Architecture

We implemented the Core + Adapters pattern:
- Core library (packages/core) - pure TypeScript, no framework dependencies
- MCP Server adapter (packages/mcp-server) - for Claude, Cursor, n8n
- Future: HTTP API adapter for cloud services

## Project Goals

Build an open-source, universal memory and context management system for LLMs that can be integrated with:
- n8n workflows (cloud and local)
- LangGraph agents
- Claude Desktop
- Cursor IDE
- Any AI agent via MCP protocol
