/**
 * Tests for SQLite storage layer
 */

import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { MemoryStorage } from "./storage.js";
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
