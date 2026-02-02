# Akashic Context

Open-source library for adding persistent memory and context management to AI agents.

**Reference**: Architecture based on [Moltbot](https://github.com/moltbot/moltbot) memory system.

## Project Status

```
Phase 1: Memory Search      ✅ CURRENT
Phase 2: Context Management 🚧 NEXT
Phase 3: Session Lifecycle  📋 FUTURE
```

## Project Structure

```
packages/
├── core/                    # Core library
│   └── src/
│       ├── memory/          # Memory system
│       │   ├── chunking.ts  # Markdown chunking (~400 tokens, 80 overlap)
│       │   ├── hybrid.ts    # Hybrid search (BM25 + Vector)
│       │   ├── storage.ts   # SQLite + FTS5 + embedding_cache
│       │   ├── manager.ts   # Memory Manager
│       │   └── providers/   # Embedding providers
│       │       ├── index.ts
│       │       └── openai.ts
│       ├── utils/           # Utilities (hash, tokens, files)
│       ├── types.ts         # Core type definitions
│       └── index.ts         # Main exports
│
└── mcp-server/              # MCP Server adapter
    └── src/
        ├── index.ts         # MCP Server implementation
        └── cli.ts           # CLI entry point
```

## Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run tests (Vitest)
pnpm test -- --run    # Run tests without watch mode
```

## Complete Roadmap (Based on Moltbot)

### Phase 1: Memory Search ✅ CURRENT

| Feature | Status | File | Moltbot Reference |
|---------|--------|------|-------------------|
| Memory Storage | ✅ | `storage.ts` | MEMORY.md + memory/*.md |
| Markdown Chunking | ✅ | `chunking.ts` | ~400 tokens, 80 overlap |
| SQLite + FTS5 | ✅ | `storage.ts` | Keyword indexing |
| BM25 Search | ✅ | `hybrid.ts` | `bm25(chunks_fts)` |
| Embedding Cache | ✅ | `storage.ts` | Hash-based deduplication |
| File Watcher | ✅ | `manager.ts` | Chokidar (5s debounce) |
| MCP Server | ✅ | `mcp-server/` | memory_search, memory_get |
| OpenAI Provider | ✅ | `providers/openai.ts` | text-embedding-3-small |

### Phase 1.5: Memory Foundation 📋 NEXT

| Feature | Status | Description | Moltbot Reference |
|---------|--------|-------------|-------------------|
| sqlite-vec Extension | 📋 | Load vector extension | `chunks_vec` table |
| Vector Search | 📋 | Cosine similarity | `vec_distance_cosine()` |
| Hybrid Merge | 📋 | 70% vec + 30% keyword | `mergeHybridResults()` |
| Embedding Batch API | 📋 | OpenAI Batch (50% cheaper) | `batch-openai.ts` |
| Gemini Provider | 📋 | Alternative embeddings | `batch-gemini.ts` |
| Multi-Agent Isolation | 📋 | Separate DB per agent | `{agentId}.sqlite` |

### Phase 2: Context Management 🚧 PLANNED

| Feature | Status | Description | Moltbot Reference |
|---------|--------|-------------|-------------------|
| Token Counting | 📋 | Measure context usage | `estimateTokensForMessages()` |
| Context Window Guard | 📋 | Warn/block thresholds | `context-window-guard.ts` |
| Memory Flush | 📋 | Save before compaction | `memory-flush.ts` |
| Compaction | 📋 | Summarize old turns | `compact.ts` |
| Soft Trim Pruning | 📋 | Keep head + tail | `pruner.ts` |
| Hard Clear Pruning | 📋 | Replace with placeholder | `pruner.ts` |

### Phase 3: Session Lifecycle 📋 FUTURE

| Feature | Status | Description | Moltbot Reference |
|---------|--------|-------------|-------------------|
| Session Management | 📋 | Reset rules (daily, manual) | `session-manager.ts` |
| Session Transcripts | 📋 | JSONL storage | `sessions/*.jsonl` |
| Session Memory Hook | 📋 | Auto-save on /new | `session-memory-hook.ts` |
| Cache-TTL Pruning | 📋 | Anthropic cache optimization | `cache-ttl.ts` |
| Lane-Based Queuing | 📋 | Prevent deadlocks | `enqueueCommandInLane()` |
| HTTP Adapter | 📋 | Cloud n8n support | REST API |

---

## Phase 1.5 Implementation Details

### Vector Search (sqlite-vec)

```typescript
// Load extension
db.loadExtension('/path/to/vec0.dylib');

// Create virtual table
CREATE VIRTUAL TABLE chunks_vec USING vec0(
  id TEXT PRIMARY KEY,
  embedding FLOAT[1536]  // 1536 dims for text-embedding-3-small
);

// Search query
SELECT
  c.id, c.path, c.text,
  (1 - vec_distance_cosine(v.embedding, ?)) AS score
FROM chunks c
JOIN chunks_vec v ON c.id = v.id
ORDER BY score DESC
LIMIT ?;
```

### Hybrid Merge Algorithm

```typescript
function mergeHybridResults(params: {
  vector: VectorResult[];      // Semantic results
  keyword: KeywordResult[];    // BM25 results
  vectorWeight: number;        // 0.7 (default)
  textWeight: number;          // 0.3 (default)
}): MergedResult[] {
  const byId = new Map();

  // Merge vector results
  for (const r of params.vector) {
    byId.set(r.id, { vectorScore: r.score, textScore: 0, ...r });
  }

  // Merge keyword results (dedupe by ID)
  for (const r of params.keyword) {
    const existing = byId.get(r.id);
    if (existing) {
      existing.textScore = r.score;
    } else {
      byId.set(r.id, { vectorScore: 0, textScore: r.score, ...r });
    }
  }

  // Weighted scoring
  return Array.from(byId.values())
    .map(item => ({
      ...item,
      finalScore: params.vectorWeight * item.vectorScore +
                  params.textWeight * item.textScore
    }))
    .sort((a, b) => b.finalScore - a.finalScore);
}
```

### Embedding Batch API

```typescript
// OpenAI Batch API (50% cheaper)
async embedChunksViaBatchAPI(chunks: Chunk[]): Promise<number[][]> {
  // 1. Build JSONL requests
  const requests = chunks.map((chunk, i) => ({
    custom_id: hash(chunk.text),
    method: "POST",
    url: "/v1/embeddings",
    body: { model: "text-embedding-3-small", input: chunk.text }
  }));

  // 2. Upload JSONL file
  const file = await openai.files.create({
    file: new Blob([requests.map(r => JSON.stringify(r)).join("\n")]),
    purpose: "batch"
  });

  // 3. Submit batch
  const batch = await openai.batches.create({
    input_file_id: file.id,
    endpoint: "/v1/embeddings",
    completion_window: "24h"
  });

  // 4. Poll for completion
  while (batch.status !== "completed") {
    await sleep(2000);
    batch = await openai.batches.retrieve(batch.id);
  }

  // 5. Download and parse results
  const output = await openai.files.content(batch.output_file_id);
  return parseEmbeddings(output);
}
```

---

## Phase 2 Implementation Details

### Token Counting

```typescript
interface TokenMetrics {
  contextWindow: number;      // e.g., 200000 (Claude)
  currentUsage: number;       // Tokens used now
  reserveTokens: number;      // e.g., 20000 (for response)
  softThreshold: number;      // Trigger for memory flush
  hardThreshold: number;      // Trigger for compaction
}

// Thresholds (Moltbot defaults)
const softThreshold = contextWindow - reserveTokens - 4000;  // 176K
const hardThreshold = contextWindow * 0.95;                   // 190K
```

### Memory Flush (Pre-Compaction Safety)

```typescript
// When to trigger
function shouldRunMemoryFlush(params: {
  totalTokens: number;
  contextWindow: number;      // 200000
  reserveTokens: number;      // 20000
  softThreshold: number;      // 4000
}): boolean {
  const threshold = params.contextWindow - params.reserveTokens - params.softThreshold;
  // 200000 - 20000 - 4000 = 176000
  return params.totalTokens > threshold;
}

// Prompt
const MEMORY_FLUSH_PROMPT = `
Pre-compaction memory flush.
Store durable memories now (use memory/YYYY-MM-DD.md).
If nothing to store, reply with __SILENT__.
`;
```

### Compaction

```typescript
interface CompactionConfig {
  enabled: boolean;
  reserveTokensFloor: number;  // 20000
  keepLastTurns: number;       // 10
}

// Result
interface CompactionResult {
  summary: string;           // LLM-generated summary
  tokensBefore: number;      // 182000
  tokensAfter: number;       // 55000
  compressionRatio: number;  // 0.30 (70% savings)
}
```

### Context Pruning

```typescript
interface PruningConfig {
  mode: 'always' | 'cache-ttl';
  keepLastAssistants: number;   // 3 (protect recent turns)

  softTrim: {                   // Context > 30%
    maxChars: number;           // 4000
    headChars: number;          // 1500
    tailChars: number;          // 1500
  };

  hardClear: {                  // Context > 50%
    enabled: boolean;
    placeholder: string;        // "[Old tool result cleared]"
  };

  minPrunableToolChars: number; // 50000
}

// Two-pass algorithm
function pruneContext(messages, config): Message[] {
  // Pass 1: Soft trim (context > 30%)
  // Keep head (1500) + tail (1500) of large tool results

  // Pass 2: Hard clear (context > 50%)
  // Replace old tool results with placeholder
}
```

---

## Phase 3 Implementation Details

### Session Lifecycle

```typescript
type SessionResetMode =
  | 'daily'     // Reset at midnight
  | 'manual'    // Reset on /new command
  | 'never';    // Never reset (continuous)

interface SessionConfig {
  resetMode: SessionResetMode;
  maxIdleMinutes: number;      // 30
  maxTurns: number;            // 500
}
```

### Cache-TTL Pruning (Anthropic Optimization)

```typescript
// Anthropic prompt caching:
// - Cache TTL: 5 minutes
// - Cache hit: 10% cost
// - Cache miss: 100% cost (re-cache)

interface CacheTtlConfig {
  enabled: boolean;
  ttlMs: number;              // 300000 (5 min)
}

// Before each request
if (Date.now() - lastCacheTouchAt > ttlMs) {
  // TTL expired → prune to invalidate cache
  // Smaller context = cheaper re-cache
  pruneContext(messages, config);
  lastCacheTouchAt = Date.now();
}
```

---

## Mathematical Tests Required

### Phase 1.5 Tests

1. **Vector search accuracy**
   - Input: query embedding
   - Expected: top-K results by cosine similarity
   - Validate: score = 1 - cosine_distance

2. **Hybrid merge correctness**
   - Input: vector results + keyword results
   - Expected: merged by ID, weighted scoring
   - Validate: finalScore = 0.7 * vec + 0.3 * keyword

3. **Batch API cost savings**
   - Input: 1000 chunks
   - Expected: 50% cheaper than individual calls
   - Validate: API cost comparison

### Phase 2 Tests

1. **Token counting accuracy**
   - Input: conversation with N messages
   - Expected: correct token count
   - Validate: compare with tiktoken

2. **Memory flush trigger**
   - Input: context at 176K tokens
   - Expected: flush triggered
   - Validate: files saved in memory/

3. **Compaction effectiveness**
   - Input: 182K tokens
   - Expected: reduced to ~55K tokens
   - Validate: compression ratio ≥ 70%

4. **Pruning effectiveness**
   - Input: tool result with 50K chars
   - Expected: reduced to 4K chars (soft trim)
   - Validate: tokens saved

### Phase 3 Tests

1. **Cache-TTL optimization**
   - Input: requests at t=0, t=2min, t=6min
   - Expected: cache hit at t=2min, prune at t=6min
   - Validate: cost reduction

---

## Code Conventions

- **Language**: TypeScript ESM, strict mode
- **Runtime**: Node 18+
- **Files**: Keep under ~500 LOC when possible
- **Tests**: Colocated as `*.test.ts`
- **Imports**: Use `.js` extension (ESM)
- **Types**: Avoid `any`, prefer explicit types

---

## Troubleshooting

### "Could not locate the bindings file" (better-sqlite3)

```bash
cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3
npm run build-release
```

### Vector search not working

sqlite-vec extension not loaded. Currently only keyword search works.
Phase 1.5 will add: `db.loadExtension('/path/to/vec0.dylib')`

### Search returns 0 results

1. Check if MEMORY.md or memory/*.md files exist
2. Use `minScore: 0` to see all results
3. Delete database: `rm -f memory.db`

---

## Links

- **Repo**: https://github.com/tostechbr/akashic-context
- **Docs**: [README.md](./README.md)
- **Testing**: [docs/TESTING.md](./docs/TESTING.md)
- **MCP Protocol**: https://modelcontextprotocol.io
- **Moltbot Reference**: https://github.com/moltbot/moltbot
