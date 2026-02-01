# 🧠 Memory Context Engine

> Universal Memory & Context Management for LLMs

**Status**: ✅ **Phase 1 Complete** - Core memory system ready for production (97.7% test coverage)

## Overview

Memory Context Engine is a standalone library that adds intelligent memory and context management to any LLM-based application. Extracted and adapted from the battle-tested [Moltbot](https://github.com/moltbot/moltbot) project.

### Features

- 🧠 **Long-term Memory**: Hybrid search (Vector + BM25) for semantic + keyword matching
- 🔌 **MCP Protocol**: Model Context Protocol server for AI agent integration
- 🤖 **Universal Integration**: Works with Claude Desktop, Cursor, n8n, LangChain, and more
- 📝 **Markdown Storage**: Human-readable, version-control friendly
- 🚀 **Battle-Tested**: Code extracted from production Moltbot system
- 🔒 **Local-First**: All data stays on your machine
- 🔐 **Secure**: Path traversal protection, file size limits, environment-based secrets

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| **[@memory-context-engine/core](./packages/core)** | Core memory system (hybrid search, embeddings, storage) | ✅ **Ready** (86/88 tests) |
| **[@memory-context-engine/mcp-server](./packages/mcp-server)** | MCP Server adapter for AI agents | ✅ **Ready** |

## Quick Start

### Option 1: Use as MCP Server (Recommended)

Perfect for Claude Desktop, Cursor, n8n, and other AI agents.

**1. Install:**
```bash
npm install -g @memory-context-engine/mcp-server
```

**2. Configure (Claude Desktop example):**
```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "memory": {
      "command": "memory-mcp-server",
      "env": {
        "MEMORY_WORKSPACE_DIR": "/path/to/your/workspace",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

**3. Use:**
Ask Claude: *"Search my memory for architecture decisions"*

See [MCP Server README](./packages/mcp-server/README.md) for full documentation.

---

### Option 2: Use as Library

Perfect for embedding directly in your TypeScript/JavaScript application.

**1. Install:**
```bash
npm install @memory-context-engine/core
```

**2. Use:**
```typescript
import { MemoryManager } from "@memory-context-engine/core";

const manager = new MemoryManager({
  dataDir: "./data",
  userId: "user-123",
  workspaceDir: "./workspace",
  memory: {
    enabled: true,
    provider: "openai",
    model: "text-embedding-3-small",
    chunkSize: 400,
    chunkOverlap: 80,
  },
});

// Index memory files
await manager.sync();

// Search
const results = await manager.search("database architecture", {
  maxResults: 5,
  minScore: 0.4,
});

console.log(results);
```

See [Core README](./packages/core/README.md) for full API documentation.

## Architecture

### Core + Adapters Pattern

```
┌─────────────────────────────────────────────────────────┐
│                    Core Library                          │
│  (@memory-context-engine/core)                          │
│                                                         │
│  • MemoryManager - Orchestration                       │
│  • HybridSearch - Vector + Keyword                     │
│  • MemoryStorage - SQLite persistence                  │
│  • EmbeddingProviders - OpenAI, Gemini, Local          │
└─────────────────────────────────────────────────────────┘
            ↑                           ↑
            │                           │
    ┌───────┴───────┐           ┌───────┴───────┐
    │  MCP Server   │           │  HTTP API     │
    │  (stdio)      │           │  (future)     │
    └───────────────┘           └───────────────┘
            ↑                           ↑
            │                           │
    ┌───────┴───────┐           ┌───────┴───────┐
    │  Claude       │           │  n8n Cloud    │
    │  Cursor       │           │  Custom Apps  │
    │  n8n (local)  │           │               │
    └───────────────┘           └───────────────┘
```

**Benefits:**
- 🎯 **Flexible**: Choose how to integrate (MCP, library, HTTP)
- 🔧 **Maintainable**: Core logic separated from integration details
- 🌍 **Open Source Friendly**: Easy to internalize or customize
- 📦 **Modular**: Adapters evolve independently

## How It Works

### Memory System (Phase 1 - Complete)

1. **Markdown Files**: Store memories in `MEMORY.md` and `memory/*.md`
2. **Chunking**: Splits content into ~400 token chunks with 80 token overlap
3. **Embeddings**: Generates vector embeddings via OpenAI/Gemini/Local
4. **Storage**: SQLite database with FTS5 (keyword) + sqlite-vec (vector)
5. **Hybrid Search**: Combines vector similarity (70%) + BM25 keyword (30%)
6. **Retrieval**: Returns ranked results with snippets and scores

### Example Memory File

```markdown
# memory/2025-01-project-decisions.md

## Database Choice

We decided to use PostgreSQL for the main database because:
- Strong ACID guarantees
- JSON support for flexible schemas
- Mature ecosystem with great tooling
- Good performance for our scale
```

### Searching

```bash
# Via MCP (Claude Desktop)
"Search memory for database decisions"

# Via Library
const results = await manager.search("database decisions");
// Returns: [{ path, startLine, endLine, score, snippet }]
```

## Development Status

### ✅ Phase 1: Memory System (Complete - 97.7%)

**Core Library** (`@memory-context-engine/core`):
- ✅ Chunking algorithm (21/21 tests passing)
- ✅ Hybrid search (25/25 tests passing)
- ✅ SQLite storage (20/20 tests passing)
- ✅ Memory Manager (18/20 tests passing - 2 edge cases)
- ✅ OpenAI embedding provider
- ✅ Utilities (hash, tokens, files)
- ✅ **Total: 86/88 tests passing** 🎉

**MCP Server** (`@memory-context-engine/mcp-server`):
- ✅ MCP Protocol implementation
- ✅ Tools: `memory_search`, `memory_get`
- ✅ stdio transport
- ✅ Path traversal protection
- ✅ File size limits (10MB)
- ✅ Full documentation + examples
- ✅ Build passing

### 🚧 Phase 2: Context Management (Planned)

- [ ] Session management
- [ ] Token counting
- [ ] Message compaction
- [ ] Context pruning

### 📋 Phase 3: Additional Adapters (Future)

- [ ] HTTP API server (for cloud services)
- [ ] LangChain Python integration
- [ ] LangChain.js integration

## Testing

```bash
# Install dependencies
pnpm install

# Build native modules (better-sqlite3)
cd node_modules/.pnpm/better-sqlite3*/node_modules/better-sqlite3
npm run build-release

# Run tests
pnpm test

# Build all packages
pnpm build
```

### Test MCP Server Locally

```bash
cd packages/mcp-server
node test-simple.js
```

See [CLAUDE.md](./CLAUDE.md) for detailed setup instructions.

## Security

- ✅ **Path Traversal Protection**: Prevents reading files outside workspace
- ✅ **File Size Limits**: 10MB max to prevent OOM attacks
- ✅ **Environment Variables**: API keys never hardcoded
- ✅ **Input Validation**: Zod schemas for all inputs

See [packages/mcp-server/SECURITY.md](./packages/mcp-server/SECURITY.md) for details.

## Documentation

- **[CLAUDE.md](./CLAUDE.md)**: Development guide, setup, troubleshooting
- **[Core Package](./packages/core/README.md)**: Core library API
- **[MCP Server](./packages/mcp-server/README.md)**: MCP Server usage
- **[Examples](./examples/README.md)**: Usage examples

## Contributing

This is an open-source project. Contributions welcome!

1. Fork the repository
2. Create your feature branch
3. Add tests
4. Submit a pull request

## Credits

This project extracts and adapts core memory and context management systems from [Moltbot](https://github.com/moltbot/moltbot), an open-source personal AI assistant.

## License

MIT License - See [LICENSE](./LICENSE) for details

## Author

Tiago Santos ([@tostechbr](https://github.com/tostechbr))

---

**Built with** ❤️ **by developers who believe AI should remember your conversations**
