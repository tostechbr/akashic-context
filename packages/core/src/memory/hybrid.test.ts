/**
 * Tests for hybrid search (vector + keyword)
 */

import { describe, expect, test } from "vitest";
import { buildFtsQuery, bm25RankToScore, mergeHybridResults } from "./hybrid.js";

describe("buildFtsQuery", () => {
  test("builds query from single word", () => {
    const query = buildFtsQuery("hello");
    expect(query).toBe('"hello"');
  });

  test("builds AND query from multiple words", () => {
    const query = buildFtsQuery("hello world");
    expect(query).toBe('"hello" AND "world"');
  });

  test("handles special characters", () => {
    const query = buildFtsQuery("hello-world test_case");
    // Underscores are kept as part of token, hyphens split tokens
    expect(query).toBe('"hello" AND "world" AND "test_case"');
  });

  test("escapes quotes in tokens", () => {
    const query = buildFtsQuery('test"quote');
    // Quotes are removed from tokens
    expect(query).toBe('"test" AND "quote"');
  });

  test("returns null for empty input", () => {
    const query = buildFtsQuery("");
    expect(query).toBeNull();
  });

  test("returns null for whitespace only", () => {
    const query = buildFtsQuery("   ");
    expect(query).toBeNull();
  });

  test("returns null for special chars only", () => {
    const query = buildFtsQuery("!@#$%^&*()");
    expect(query).toBeNull();
  });

  test("filters empty tokens", () => {
    const query = buildFtsQuery("hello   world");
    expect(query).toBe('"hello" AND "world"');
  });

  test("handles numbers", () => {
    const query = buildFtsQuery("test 123 foo");
    expect(query).toBe('"test" AND "123" AND "foo"');
  });

  test("handles underscores", () => {
    const query = buildFtsQuery("hello_world test_case");
    expect(query).toBe('"hello_world" AND "test_case"');
  });
});

describe("bm25RankToScore", () => {
  test("converts rank 0 to score 1.0", () => {
    const score = bm25RankToScore(0);
    // Formula: 1 / (1 + 0) = 1
    expect(score).toBeCloseTo(1.0, 2);
  });

  test("converts negative rank to same score (normalized to 0)", () => {
    const score1 = bm25RankToScore(-10);
    const score2 = bm25RankToScore(-20);
    // Negative ranks are normalized to 0: 1 / (1 + 0) = 1
    expect(score1).toBe(score2);
    expect(score1).toBe(1.0);
  });

  test("converts positive rank to lower score", () => {
    const score1 = bm25RankToScore(10);
    const score2 = bm25RankToScore(20);
    expect(score1).toBeGreaterThan(score2);
  });

  test("handles very large rank", () => {
    const score = bm25RankToScore(10000);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  test("handles infinity", () => {
    const score = bm25RankToScore(Infinity);
    expect(score).toBeGreaterThan(0);
    expect(Number.isFinite(score)).toBe(true);
  });

  test("handles NaN", () => {
    const score = bm25RankToScore(NaN);
    expect(Number.isFinite(score)).toBe(true);
  });

  test("score decreases as rank increases (positive ranks only)", () => {
    const scores = [0, 10, 50, 100].map(bm25RankToScore);
    // Negative ranks are normalized to 0, so only test positive progression
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i + 1]!);
    }
  });
});

describe("mergeHybridResults", () => {
  test("merges vector and keyword results", () => {
    const vector = [
      {
        id: "1",
        path: "file.md",
        startLine: 1,
        endLine: 5,
        source: "memory",
        snippet: "Vector result",
        vectorScore: 0.9,
      },
    ];

    const keyword = [
      {
        id: "2",
        path: "file.md",
        startLine: 10,
        endLine: 15,
        source: "memory",
        snippet: "Keyword result",
        textScore: 0.8,
      },
    ];

    const merged = mergeHybridResults({
      vector,
      keyword,
      vectorWeight: 0.7,
      textWeight: 0.3,
    });

    expect(merged).toHaveLength(2);
    expect(merged.find((r) => r.snippet === "Vector result")).toBeDefined();
    expect(merged.find((r) => r.snippet === "Keyword result")).toBeDefined();
  });

  test("combines scores for same result in both lists", () => {
    const vector = [
      {
        id: "1",
        path: "file.md",
        startLine: 1,
        endLine: 5,
        source: "memory",
        snippet: "Same result",
        vectorScore: 0.9,
      },
    ];

    const keyword = [
      {
        id: "1",
        path: "file.md",
        startLine: 1,
        endLine: 5,
        source: "memory",
        snippet: "Same result",
        textScore: 0.8,
      },
    ];

    const merged = mergeHybridResults({
      vector,
      keyword,
      vectorWeight: 0.7,
      textWeight: 0.3,
    });

    expect(merged).toHaveLength(1);
    // Final score = 0.7 * 0.9 + 0.3 * 0.8 = 0.63 + 0.24 = 0.87
    expect(merged[0]?.score).toBeCloseTo(0.87, 2);
  });

  test("sorts results by score descending", () => {
    const vector = [
      {
        id: "1",
        path: "file.md",
        startLine: 1,
        endLine: 5,
        source: "memory",
        snippet: "Low score",
        vectorScore: 0.5,
      },
      {
        id: "2",
        path: "file.md",
        startLine: 10,
        endLine: 15,
        source: "memory",
        snippet: "High score",
        vectorScore: 0.9,
      },
    ];

    const merged = mergeHybridResults({
      vector,
      keyword: [],
      vectorWeight: 1.0,
      textWeight: 0.0,
    });

    expect(merged[0]?.snippet).toBe("High score");
    expect(merged[1]?.snippet).toBe("Low score");
  });

  test("handles empty vector results", () => {
    const keyword = [
      {
        id: "1",
        path: "file.md",
        startLine: 1,
        endLine: 5,
        source: "memory",
        snippet: "Keyword only",
        textScore: 0.8,
      },
    ];

    const merged = mergeHybridResults({
      vector: [],
      keyword,
      vectorWeight: 0.7,
      textWeight: 0.3,
    });

    expect(merged).toHaveLength(1);
    // Score should be textWeight * textScore = 0.3 * 0.8 = 0.24
    expect(merged[0]?.score).toBeCloseTo(0.24, 2);
  });

  test("handles empty keyword results", () => {
    const vector = [
      {
        id: "1",
        path: "file.md",
        startLine: 1,
        endLine: 5,
        source: "memory",
        snippet: "Vector only",
        vectorScore: 0.9,
      },
    ];

    const merged = mergeHybridResults({
      vector,
      keyword: [],
      vectorWeight: 0.7,
      textWeight: 0.3,
    });

    expect(merged).toHaveLength(1);
    // Score should be vectorWeight * vectorScore = 0.7 * 0.9 = 0.63
    expect(merged[0]?.score).toBeCloseTo(0.63, 2);
  });

  test("handles both empty lists", () => {
    const merged = mergeHybridResults({
      vector: [],
      keyword: [],
      vectorWeight: 0.7,
      textWeight: 0.3,
    });

    expect(merged).toHaveLength(0);
  });

  test("respects custom weights", () => {
    const vector = [
      {
        id: "1",
        path: "file.md",
        startLine: 1,
        endLine: 5,
        source: "memory",
        snippet: "Result",
        vectorScore: 1.0,
      },
    ];

    const keyword = [
      {
        id: "1",
        path: "file.md",
        startLine: 1,
        endLine: 5,
        source: "memory",
        snippet: "Result",
        textScore: 1.0,
      },
    ];

    const merged = mergeHybridResults({
      vector,
      keyword,
      vectorWeight: 0.5,
      textWeight: 0.5,
    });

    // Score = 0.5 * 1.0 + 0.5 * 1.0 = 1.0
    expect(merged[0]?.score).toBeCloseTo(1.0, 2);
  });

  test("preserves metadata fields", () => {
    const vector = [
      {
        id: "1",
        path: "test/file.md",
        startLine: 10,
        endLine: 20,
        source: "sessions",
        snippet: "Test content",
        vectorScore: 0.8,
      },
    ];

    const merged = mergeHybridResults({
      vector,
      keyword: [],
      vectorWeight: 1.0,
      textWeight: 0.0,
    });

    const result = merged[0]!;
    expect(result.path).toBe("test/file.md");
    expect(result.startLine).toBe(10);
    expect(result.endLine).toBe(20);
    expect(result.source).toBe("sessions");
    expect(result.snippet).toBe("Test content");
  });
});
