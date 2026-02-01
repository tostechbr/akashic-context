# Architecture Decisions - January 2025

## Core + Adapters Pattern

We decided to use the Core + Adapters architectural pattern for the Memory Context Engine.

### Why Core + Adapters?

1. **Flexibility**: Each company can choose how to use the system
   - Import core library directly (zero network overhead)
   - Use MCP Server for standard agent integration
   - Use HTTP API for cloud services
   - Create custom adapters as needed

2. **Maintainability**: Core logic is separated from integration details
   - Core has zero framework dependencies
   - Adapters can evolve independently
   - Easy to add new adapters without touching core

3. **Open Source Friendly**: Users can:
   - Internalize the project easily (just import core)
   - Customize adapters for their specific needs
   - Contribute new adapters back to the community

### Memory System Components

- **Chunking Pipeline**: Splits markdown into 400-token chunks with 80-token overlap
- **Hybrid Search**: Combines vector similarity (70%) + BM25 keyword search (30%)
- **Storage**: SQLite with FTS5 (keyword) and sqlite-vec (vector embeddings)
- **Embedding Cache**: Deduplication by content hash to avoid re-embedding

### MCP Server Adapter

The first adapter we built exposes two tools:

1. `memory_search` - Search conversation history with hybrid vector + keyword
2. `memory_get` - Retrieve specific lines from memory files

This works with Claude Desktop, Cursor, and n8n (via MCP protocol).
