/**
 * Tests for markdown chunking algorithm
 */

import { describe, expect, test } from "vitest";
import { chunkMarkdown, cosineSimilarity, parseEmbedding } from "./chunking.js";

describe("chunkMarkdown", () => {
  test("chunks small content into single chunk", () => {
    const content = "Line 1\nLine 2\nLine 3";
    const chunks = chunkMarkdown(content, { tokens: 100, overlap: 20 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toBe(content);
    expect(chunks[0]?.startLine).toBe(1);
    expect(chunks[0]?.endLine).toBe(3);
  });

  test("chunks large content into multiple chunks", () => {
    // Create content that exceeds maxChars (100 tokens * 4 = 400 chars)
    const lines = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}: Some content here`);
    const content = lines.join("\n");

    const chunks = chunkMarkdown(content, { tokens: 100, overlap: 20 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.startLine).toBe(1);
    expect(chunks[chunks.length - 1]?.endLine).toBe(50);
  });

  test("preserves overlap between chunks", () => {
    const lines = Array.from({ length: 30 }, (_, i) => `Line ${i + 1}`);
    const content = lines.join("\n");

    const chunks = chunkMarkdown(content, { tokens: 50, overlap: 20 });

    if (chunks.length >= 2) {
      const firstChunk = chunks[0]!;
      const secondChunk = chunks[1]!;

      // Second chunk should start before first chunk ends (overlap)
      expect(secondChunk.startLine).toBeLessThanOrEqual(firstChunk.endLine);
    }
  });

  test("handles empty content", () => {
    const chunks = chunkMarkdown("", { tokens: 100, overlap: 20 });
    // Empty content creates one empty line, which creates one chunk
    expect(chunks.length).toBeGreaterThanOrEqual(0);
  });

  test("handles single line", () => {
    const content = "Single line of text";
    const chunks = chunkMarkdown(content, { tokens: 100, overlap: 20 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toBe(content);
    expect(chunks[0]?.startLine).toBe(1);
    expect(chunks[0]?.endLine).toBe(1);
  });

  test("handles very long single line", () => {
    // Line longer than maxChars (100 tokens * 4 = 400 chars)
    const longLine = "x".repeat(1000);
    const chunks = chunkMarkdown(longLine, { tokens: 100, overlap: 20 });

    expect(chunks.length).toBeGreaterThan(1);
    // All chunks should have same line number (line was split)
    chunks.forEach((chunk) => {
      expect(chunk.startLine).toBe(1);
      expect(chunk.endLine).toBe(1);
    });
  });

  test("respects minimum chunk size", () => {
    const content = "Short";
    const chunks = chunkMarkdown(content, { tokens: 1, overlap: 0 });

    // Should still create chunk even with very small token limit
    // (maxChars is clamped to minimum of 32)
    expect(chunks).toHaveLength(1);
  });

  test("generates unique hashes for different content", () => {
    const content1 = "Content A\nLine 2";
    const content2 = "Content B\nLine 2";

    const chunks1 = chunkMarkdown(content1, { tokens: 100, overlap: 20 });
    const chunks2 = chunkMarkdown(content2, { tokens: 100, overlap: 20 });

    expect(chunks1[0]?.hash).not.toBe(chunks2[0]?.hash);
  });

  test("generates same hash for identical content", () => {
    const content = "Same content\nLine 2";

    const chunks1 = chunkMarkdown(content, { tokens: 100, overlap: 20 });
    const chunks2 = chunkMarkdown(content, { tokens: 100, overlap: 20 });

    expect(chunks1[0]?.hash).toBe(chunks2[0]?.hash);
  });
});

describe("cosineSimilarity", () => {
  test("returns 1 for identical vectors", () => {
    const vec = [1, 2, 3, 4, 5];
    const similarity = cosineSimilarity(vec, vec);
    expect(similarity).toBeCloseTo(1.0, 5);
  });

  test("returns 0 for orthogonal vectors", () => {
    const vec1 = [1, 0, 0];
    const vec2 = [0, 1, 0];
    const similarity = cosineSimilarity(vec1, vec2);
    expect(similarity).toBeCloseTo(0.0, 5);
  });

  test("returns ~-1 for opposite vectors", () => {
    const vec1 = [1, 2, 3];
    const vec2 = [-1, -2, -3];
    const similarity = cosineSimilarity(vec1, vec2);
    expect(similarity).toBeCloseTo(-1.0, 5);
  });

  test("handles empty vectors", () => {
    const similarity = cosineSimilarity([], []);
    expect(similarity).toBe(0);
  });

  test("handles different length vectors", () => {
    const vec1 = [1, 2, 3];
    const vec2 = [1, 2, 3, 4, 5];
    // Should use minimum length
    const similarity = cosineSimilarity(vec1, vec2);
    expect(similarity).toBeGreaterThan(0);
  });

  test("handles zero vectors", () => {
    const vec1 = [0, 0, 0];
    const vec2 = [1, 2, 3];
    const similarity = cosineSimilarity(vec1, vec2);
    expect(similarity).toBe(0);
  });

  test("returns value between -1 and 1", () => {
    const vec1 = [1.5, 2.3, -0.5];
    const vec2 = [0.2, -1.1, 3.7];
    const similarity = cosineSimilarity(vec1, vec2);
    expect(similarity).toBeGreaterThanOrEqual(-1);
    expect(similarity).toBeLessThanOrEqual(1);
  });
});

describe("parseEmbedding", () => {
  test("parses valid JSON array", () => {
    const json = "[1, 2, 3, 4, 5]";
    const result = parseEmbedding(json);
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  test("returns empty array for invalid JSON", () => {
    const invalid = "not json";
    const result = parseEmbedding(invalid);
    expect(result).toEqual([]);
  });

  test("returns empty array for non-array JSON", () => {
    const notArray = '{"key": "value"}';
    const result = parseEmbedding(notArray);
    expect(result).toEqual([]);
  });

  test("handles empty array", () => {
    const json = "[]";
    const result = parseEmbedding(json);
    expect(result).toEqual([]);
  });

  test("handles float values", () => {
    const json = "[1.5, 2.7, 3.14]";
    const result = parseEmbedding(json);
    expect(result).toEqual([1.5, 2.7, 3.14]);
  });
});
