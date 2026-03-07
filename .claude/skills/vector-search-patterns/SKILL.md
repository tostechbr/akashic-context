---
name: vector-search-patterns
description: Patterns for implementing in-process vector search in Akashic Context — cosine similarity in TypeScript, searchVectorInProcess(), hybrid merge integration. Preload into agents implementing Sprint 1.
user-invocable: false
---

# Vector Search Patterns — Akashic Context Sprint 1

## Design Decision (D1)

**No sqlite-vec extension.** Cosine similarity implemented in TypeScript directly.

Why: Embeddings already stored as JSON in `chunks.embedding` column. sqlite-vec has platform loading issues. In-process is sufficient for ~2000 chunks/user.

## cosine Similarity Function

Add as module-level function in `storage.ts` (NOT exported — internal utility):

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const mag = Math.sqrt(magA) * Math.sqrt(magB);
  if (mag === 0) return 0;
  return dot / mag;
}
```

**Mathematical properties** (use in tests):
- `cosineSimilarity([1,0], [1,0])` → `1.0` (identical)
- `cosineSimilarity([1,0], [0,1])` → `0.0` (orthogonal)
- `cosineSimilarity([1,0], [-1,0])` → `-1.0` (opposite)

## searchVectorInProcess() in storage.ts

Add alongside existing `searchVector()` method:

```typescript
searchVectorInProcess(params: SearchVectorParams): VectorSearchResult[] {
  let sql = `
    SELECT id, path, source, start_line as startLine, end_line as endLine, text, embedding
    FROM chunks
  `;
  const queryParams: unknown[] = [];

  if (params.source) {
    sql += " WHERE source = ?";
    queryParams.push(params.source);
  }

  const rows = this.db.prepare(sql).all(...queryParams) as Array<{
    id: string; path: string; source: string;
    startLine: number; endLine: number; text: string; embedding: string;
  }>;

  const queryEmb = params.embedding;

  return rows
    .map(row => {
      let chunkEmb: number[];
      try {
        chunkEmb = JSON.parse(row.embedding) as number[];
      } catch {
        return null;
      }
      const similarity = cosineSimilarity(queryEmb, chunkEmb);
      return {
        id: row.id,
        path: row.path,
        source: row.source,
        startLine: row.startLine,
        endLine: row.endLine,
        text: row.text,
        distance: 1 - similarity, // Lower is better (consistent with searchVector interface)
      };
    })
    .filter((r): r is VectorSearchResult => r !== null && r.distance <= (1 - 0.3))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, params.limit);
}
```

## Integration with manager.ts

In `searchMemory()`, the hybrid search calls storage vector search. Replace the error throw with in-process fallback:

```typescript
// In manager.ts searchMemory() or hybrid.ts
// BEFORE (throws if no vec extension):
// const vectorResults = this.storage.searchVector(params);

// AFTER (always works):
const vectorResults = this.storage.isVecAvailable()
  ? this.storage.searchVector(params)
  : this.storage.searchVectorInProcess(params);
```

## SearchVectorParams — deduplication threshold

For `memory_add` deduplication, pass a tighter limit:

```typescript
// "Is this a duplicate?" query
const similar = storage.searchVectorInProcess({
  embedding: queryEmbedding,
  limit: 3,
  source: undefined,
});

// Filter by similarity threshold (D3: 0.85 cosine = 0.15 distance)
const duplicates = similar.filter(r => r.distance <= 0.15);
```

## Files to modify

- `packages/core/src/memory/storage.ts` — add `cosineSimilarity()` + `searchVectorInProcess()`
- `packages/core/src/memory/manager.ts` — use `searchVectorInProcess` as fallback
- `packages/core/src/memory/storage.test.ts` — add math tests + integration tests

## Test Pattern

```typescript
describe("cosineSimilarity", () => {
  test("identical vectors = 1", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);
  });
  test("orthogonal vectors = 0", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });
  test("opposite vectors = -1", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0);
  });
});

describe("searchVectorInProcess", () => {
  test("returns results sorted by similarity", async () => {
    // store chunk → search with its own embedding → should be first result
    // with distance ≈ 0 (distance = 1 - similarity)
  });
});
```
