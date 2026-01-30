# 🧠 Memory Context Engine

> Universal Memory & Context Management for LLMs

**Status**: 🚧 **Work in Progress** - MVP under active development

## Overview

Memory Context Engine is a standalone library that adds intelligent memory and context management to any LLM-based application. Extracted and adapted from the battle-tested [Moltbot](https://github.com/moltbot/moltbot) project.

### Features

- 🧠 **Long-term Memory**: Hybrid search (Vector + BM25) for semantic + keyword matching
- ⏱️ **Context Management**: Auto-compaction, pruning, and memory flush
- 🔌 **LLM-Agnostic**: Works with OpenAI, Anthropic, Gemini, or local models
- 📝 **Markdown Storage**: Human-readable, version-control friendly
- 🚀 **Battle-Tested**: Code extracted from production Moltbot system
- 🔒 **Local-First**: All data stays on your machine

## Installation

```bash
npm install memory-context-engine
```

## Quick Start

```typescript
import { MemoryContextEngine } from "memory-context-engine";

// Initialize engine
const engine = new MemoryContextEngine({
  userId: "user-123",
  dataDir: "./data",
  memory: {
    enabled: true,
    provider: "openai",
    model: "text-embedding-3-small",
    chunkSize: 400,
    chunkOverlap: 80
  },
  context: {
    maxTokens: 128000,
    reserveTokens: 20000,
    compactionEnabled: true,
    pruningEnabled: true
  }
});

// Add user message
await engine.addMessage({
  role: "user",
  content: "What database should we use?"
});

// Prepare optimized context (auto memory search + compaction + pruning)
const context = await engine.prepareContext({
  includeMemory: true
});

// Send to any LLM
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: context.systemPrompt },
    ...context.messages
  ]
});

// Save response
await engine.addMessage({
  role: "assistant",
  content: response.choices[0].message.content
});
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     YOUR APPLICATION                    │
│   (Chatbot, RAG system, Assistant, etc.)                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓ Simple API
┌─────────────────────────────────────────────────────────┐
│         📦 MEMORY CONTEXT ENGINE                        │
│                                                         │
│  🧠 Memory System (Long-term)                           │
│  - Hybrid Search (Vector + BM25)                        │
│  - Markdown storage                                     │
│  - Multi-user isolation                                 │
│                                                         │
│  ⏱️ Context Manager (Short-term)                        │
│  - Session compaction                                   │
│  - Memory flush                                          │
│  - Context pruning                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓ Optimized Context
┌─────────────────────────────────────────────────────────┐
│                  ANY LLM                                │
│      (OpenAI, Anthropic, Gemini, Local, etc.)           │
└─────────────────────────────────────────────────────────┘
```

## Development Status

### ✅ Completed (Phase 1 - MVP Setup)
- [x] Project structure
- [x] TypeScript configuration
- [x] Core types
- [x] Hybrid search algorithm

### 🚧 In Progress (Phase 1 - Memory System)
- [ ] Memory manager
- [ ] SQLite storage
- [ ] Embedding providers (OpenAI)
- [ ] Indexing pipeline
- [ ] Tests

### 📋 Planned
- [ ] Context manager (Phase 2)
- [ ] Engine API (Phase 3)
- [ ] Examples (Phase 4)
- [ ] Documentation (Phase 4)

## Roadmap

See [fork-extraction-plan.md](./docs/fork-extraction-plan.md) for detailed roadmap.

## Credits

This project extracts and adapts core memory and context management systems from [Moltbot](https://github.com/moltbot/moltbot), an open-source personal AI assistant.

## License

MIT License - See [LICENSE](./LICENSE) for details

## Author

Tiago Santos

---

**⚠️ Note**: This is an early-stage project under active development. APIs may change before v1.0.0.
