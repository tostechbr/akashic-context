/**
 * Tests for SQLite storage layer
 */

import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { MemoryStorage } from "./storage.js";
import { cosineSimilarity } from "./chunking.js";
import fs from "node:fs";
import path from "node:path";

describe("MemoryStorage", () => {
  let storage: MemoryStorage;
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for test databases
    tempDir = path.join(process.cwd(), ".test-db");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    storage = new MemoryStorage({
      dataDir: tempDir,
      userId: "test-user",
      sessionId: `test-${Date.now()}`,
    });
  });

  afterEach(() => {
    storage.close();

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("initialization", () => {
    test("creates database file", () => {
      const dbPath = storage.getPath();
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    test("initializes schema", () => {
      // If storage was created without errors, schema is initialized
      expect(storage).toBeDefined();
    });

    test("reports FTS availability", () => {
      const available = storage.isFtsAvailable();
      expect(typeof available).toBe("boolean");
    });

    test("reports vector availability", () => {
      const available = storage.isVecAvailable();
      expect(available).toBe(false); // Not loaded yet
    });
  });

  describe("file operations", () => {
    test("upserts file metadata", () => {
      const file = {
        path: "test.md",
        source: "memory",
        hash: "abc123",
        mtime: Date.now(),
        size: 1024,
      };

      storage.upsertFile(file);
      const retrieved = storage.getFile("test.md");

      expect(retrieved).toEqual(file);
    });

    test("updates existing file", () => {
      const file = {
        path: "test.md",
        source: "memory",
        hash: "abc123",
        mtime: Date.now(),
        size: 1024,
      };

      storage.upsertFile(file);

      const updated = {
        ...file,
        hash: "xyz789",
        size: 2048,
      };

      storage.upsertFile(updated);
      const retrieved = storage.getFile("test.md");

      expect(retrieved?.hash).toBe("xyz789");
      expect(retrieved?.size).toBe(2048);
    });

    test("deletes file", () => {
      const file = {
        path: "test.md",
        source: "memory",
        hash: "abc123",
        mtime: Date.now(),
        size: 1024,
      };

      storage.upsertFile(file);
      storage.deleteFile("test.md");

      const retrieved = storage.getFile("test.md");
      expect(retrieved).toBeNull();
    });

    test("returns null for non-existent file", () => {
      const retrieved = storage.getFile("does-not-exist.md");
      expect(retrieved).toBeNull();
    });
  });

  describe("chunk operations", () => {
    test("upserts chunk", () => {
      const chunk = {
        id: "test-chunk-1",
        path: "test.md",
        source: "memory",
        startLine: 1,
        endLine: 5,
        hash: "chunk-hash",
        model: "text-embedding-3-small",
        text: "Test content",
        embedding: JSON.stringify([0.1, 0.2, 0.3]),
        updatedAt: Date.now(),
      };

      storage.upsertChunk(chunk);

      // Verify chunk was inserted (check count)
      const count = storage.getChunkCount();
      expect(count).toBe(1);
    });

    test("updates existing chunk", () => {
      const chunk = {
        id: "test-chunk-1",
        path: "test.md",
        source: "memory",
        startLine: 1,
        endLine: 5,
        hash: "chunk-hash",
        model: "text-embedding-3-small",
        text: "Original text",
        embedding: JSON.stringify([0.1, 0.2, 0.3]),
        updatedAt: Date.now(),
      };

      storage.upsertChunk(chunk);

      const updated = {
        ...chunk,
        text: "Updated text",
        hash: "new-hash",
      };

      storage.upsertChunk(updated);

      // Should still be 1 chunk (updated, not inserted)
      const count = storage.getChunkCount();
      expect(count).toBe(1);
    });

    test("deletes chunks by path", () => {
      const chunk1 = {
        id: "chunk-1",
        path: "test.md",
        source: "memory",
        startLine: 1,
        endLine: 5,
        hash: "hash1",
        model: "text-embedding-3-small",
        text: "Chunk 1",
        embedding: JSON.stringify([0.1, 0.2, 0.3]),
        updatedAt: Date.now(),
      };

      const chunk2 = {
        id: "chunk-2",
        path: "other.md",
        source: "memory",
        startLine: 1,
        endLine: 5,
        hash: "hash2",
        model: "text-embedding-3-small",
        text: "Chunk 2",
        embedding: JSON.stringify([0.4, 0.5, 0.6]),
        updatedAt: Date.now(),
      };

      storage.upsertChunk(chunk1);
      storage.upsertChunk(chunk2);

      storage.deleteChunksByPath("test.md");

      const count = storage.getChunkCount();
      expect(count).toBe(1); // Only chunk2 remains
    });

    test("counts chunks by source", () => {
      const chunk1 = {
        id: "chunk-1",
        path: "test.md",
        source: "memory",
        startLine: 1,
        endLine: 5,
        hash: "hash1",
        model: "text-embedding-3-small",
        text: "Memory chunk",
        embedding: JSON.stringify([0.1, 0.2, 0.3]),
        updatedAt: Date.now(),
      };

      const chunk2 = {
        id: "chunk-2",
        path: "session.md",
        source: "sessions",
        startLine: 1,
        endLine: 5,
        hash: "hash2",
        model: "text-embedding-3-small",
        text: "Session chunk",
        embedding: JSON.stringify([0.4, 0.5, 0.6]),
        updatedAt: Date.now(),
      };

      storage.upsertChunk(chunk1);
      storage.upsertChunk(chunk2);

      const memoryCount = storage.getChunkCount("memory");
      const sessionCount = storage.getChunkCount("sessions");
      const totalCount = storage.getChunkCount();

      expect(memoryCount).toBe(1);
      expect(sessionCount).toBe(1);
      expect(totalCount).toBe(2);
    });
  });

  describe("embedding cache", () => {
    test("caches embedding", () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      storage.cacheEmbedding(
        "openai",
        "text-embedding-3-small",
        "key123",
        "hash-abc",
        embedding,
        5
      );

      const cached = storage.getCachedEmbedding(
        "openai",
        "text-embedding-3-small",
        "key123",
        "hash-abc"
      );

      expect(cached).toEqual(embedding);
    });

    test("returns null for non-existent cache", () => {
      const cached = storage.getCachedEmbedding(
        "openai",
        "text-embedding-3-small",
        "key123",
        "non-existent"
      );

      expect(cached).toBeNull();
    });

    test("updates cached embedding", () => {
      const embedding1 = [0.1, 0.2, 0.3];
      const embedding2 = [0.4, 0.5, 0.6];

      storage.cacheEmbedding(
        "openai",
        "text-embedding-3-small",
        "key123",
        "hash-abc",
        embedding1
      );

      storage.cacheEmbedding(
        "openai",
        "text-embedding-3-small",
        "key123",
        "hash-abc",
        embedding2
      );

      const cached = storage.getCachedEmbedding(
        "openai",
        "text-embedding-3-small",
        "key123",
        "hash-abc"
      );

      expect(cached).toEqual(embedding2);
    });

    test("distinguishes by provider", () => {
      const embedding = [0.1, 0.2, 0.3];

      storage.cacheEmbedding(
        "openai",
        "text-embedding-3-small",
        "key123",
        "hash-abc",
        embedding
      );

      const cached = storage.getCachedEmbedding(
        "gemini",
        "text-embedding-3-small",
        "key123",
        "hash-abc"
      );

      expect(cached).toBeNull(); // Different provider
    });
  });

  describe("keyword search", () => {
    test("throws if FTS not available", () => {
      if (!storage.isFtsAvailable()) {
        expect(() =>
          storage.searchKeyword({ query: "test", limit: 10 })
        ).toThrow();
      }
    });

    test("searches chunks by keyword", () => {
      if (!storage.isFtsAvailable()) {
        return; // Skip if FTS not available
      }

      const chunk = {
        id: "chunk-1",
        path: "test.md",
        source: "memory",
        startLine: 1,
        endLine: 5,
        hash: "hash1",
        model: "text-embedding-3-small",
        text: "This is a test document with important keywords",
        embedding: JSON.stringify([0.1, 0.2, 0.3]),
        updatedAt: Date.now(),
      };

      storage.upsertChunk(chunk);

      const results = storage.searchKeyword({
        query: "important keywords",
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.id).toBe("chunk-1");
    });

    test("filters by source", () => {
      if (!storage.isFtsAvailable()) {
        return;
      }

      const chunk1 = {
        id: "chunk-1",
        path: "test.md",
        source: "memory",
        startLine: 1,
        endLine: 5,
        hash: "hash1",
        model: "text-embedding-3-small",
        text: "Memory document with test keyword",
        embedding: JSON.stringify([0.1, 0.2, 0.3]),
        updatedAt: Date.now(),
      };

      const chunk2 = {
        id: "chunk-2",
        path: "session.md",
        source: "sessions",
        startLine: 1,
        endLine: 5,
        hash: "hash2",
        model: "text-embedding-3-small",
        text: "Session document with test keyword",
        embedding: JSON.stringify([0.4, 0.5, 0.6]),
        updatedAt: Date.now(),
      };

      storage.upsertChunk(chunk1);
      storage.upsertChunk(chunk2);

      const results = storage.searchKeyword({
        query: "test",
        limit: 10,
        source: "memory",
      });

      expect(results.every((r) => r.source === "memory")).toBe(true);
    });
  });

  describe("close", () => {
    test("closes database connection", () => {
      storage.close();
      // No error should be thrown
      expect(true).toBe(true);
    });
  });
});

// ─── cosineSimilarity unit tests ──────────────────────────────────────────────

describe("cosineSimilarity", () => {
  test("identical vectors → 1", () => {
    const v = [1, 0, 0, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 10);
  });

  test("orthogonal vectors → 0", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });

  test("opposite vectors → -1", () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 10);
  });

  test("zero vector → 0 (no division by zero)", () => {
    expect(cosineSimilarity([0, 0, 0], [1, 0, 0])).toBe(0);
  });

  test("normalized unit vectors in 3D", () => {
    const a = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];
    const b = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 10);
  });

  test("partial overlap vectors have similarity between 0 and 1", () => {
    const sim = cosineSimilarity([1, 1, 0], [1, 0, 0]);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
    // cos(45°) = 1/√2 ≈ 0.707
    expect(sim).toBeCloseTo(1 / Math.sqrt(2), 5);
  });
});

// ─── searchVectorInProcess tests ──────────────────────────────────────────────

describe("searchVectorInProcess", () => {
  let storage: MemoryStorage;
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(process.cwd(), ".test-vec-db");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    storage = new MemoryStorage({
      dataDir: tempDir,
      userId: "vec-test-user",
      sessionId: `vec-${Date.now()}`,
    });
  });

  afterEach(() => {
    storage.close();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("returns nearest chunk sorted by distance ASC", () => {
    // Near chunk: embedding = [1, 0, 0] → cosine sim with query [1,0,0] = 1 → distance = 0
    storage.upsertChunk({
      id: "near",
      path: "test.md",
      source: "memory",
      startLine: 1,
      endLine: 2,
      hash: "h1",
      model: "test",
      text: "near chunk",
      embedding: JSON.stringify([1, 0, 0]),
      updatedAt: Date.now(),
    });

    // Far chunk: embedding = [0, 1, 0] → cosine sim with query [1,0,0] = 0 → distance = 1
    storage.upsertChunk({
      id: "far",
      path: "test.md",
      source: "memory",
      startLine: 3,
      endLine: 4,
      hash: "h2",
      model: "test",
      text: "far chunk",
      embedding: JSON.stringify([0, 1, 0]),
      updatedAt: Date.now(),
    });

    // Default maxDistance = 0.7, so "near" (d=0) is included, "far" (d=1) is excluded
    const results = storage.searchVectorInProcess({ embedding: [1, 0, 0], limit: 10 });
    expect(results.length).toBe(1);
    expect(results[0]?.id).toBe("near");
    expect(results[0]?.distance).toBeCloseTo(0, 10);
  });

  test("filters by maxDistance", () => {
    // Two partially-similar chunks
    storage.upsertChunk({
      id: "c1",
      path: "a.md",
      source: "memory",
      startLine: 1,
      endLine: 1,
      hash: "h1",
      model: "test",
      text: "chunk1",
      embedding: JSON.stringify([1, 1, 0]),
      updatedAt: Date.now(),
    });
    storage.upsertChunk({
      id: "c2",
      path: "a.md",
      source: "memory",
      startLine: 2,
      endLine: 2,
      hash: "h2",
      model: "test",
      text: "chunk2",
      embedding: JSON.stringify([1, 0, 0]),
      updatedAt: Date.now(),
    });

    // Query [1, 0, 0]:
    // c1: cosine([1,0,0],[1,1,0]) = 1/√2 ≈ 0.707, distance ≈ 0.293
    // c2: cosine([1,0,0],[1,0,0]) = 1, distance = 0

    // maxDistance = 0.15 → only c2 (d=0)
    const strict = storage.searchVectorInProcess({ embedding: [1, 0, 0], limit: 10, maxDistance: 0.15 });
    expect(strict.length).toBe(1);
    expect(strict[0]?.id).toBe("c2");

    // maxDistance = 0.4 → both c1 (d≈0.293) and c2 (d=0)
    const loose = storage.searchVectorInProcess({ embedding: [1, 0, 0], limit: 10, maxDistance: 0.4 });
    expect(loose.length).toBe(2);
    expect(loose[0]?.id).toBe("c2"); // nearest first
    expect(loose[1]?.id).toBe("c1");
  });

  test("respects limit", () => {
    for (let i = 0; i < 5; i++) {
      storage.upsertChunk({
        id: `c${i}`,
        path: "x.md",
        source: "memory",
        startLine: i,
        endLine: i,
        hash: `h${i}`,
        model: "test",
        text: `chunk ${i}`,
        embedding: JSON.stringify([1, i * 0.01, 0]), // all very close to [1,0,0]
        updatedAt: Date.now(),
      });
    }

    const results = storage.searchVectorInProcess({ embedding: [1, 0, 0], limit: 2, maxDistance: 1.0 });
    expect(results.length).toBe(2);
  });

  test("returns empty when no chunks within maxDistance", () => {
    storage.upsertChunk({
      id: "c1",
      path: "x.md",
      source: "memory",
      startLine: 1,
      endLine: 1,
      hash: "h1",
      model: "test",
      text: "orthogonal",
      embedding: JSON.stringify([0, 1, 0]),
      updatedAt: Date.now(),
    });

    // Query [1,0,0] vs chunk [0,1,0]: distance = 1 > maxDistance 0.15
    const results = storage.searchVectorInProcess({
      embedding: [1, 0, 0],
      limit: 10,
      maxDistance: 0.15,
    });
    expect(results.length).toBe(0);
  });
});
