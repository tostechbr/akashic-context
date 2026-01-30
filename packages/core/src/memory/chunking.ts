/**
 * Markdown chunking utilities
 * Extracted from Moltbot memory system
 */

import { hashText } from "../utils/hash.js";
import type { MemoryChunk } from "../types.js";

export interface ChunkingConfig {
  tokens: number;
  overlap: number;
}

/**
 * Chunk markdown content into overlapping segments
 *
 * Algorithm:
 * 1. Split content into lines
 * 2. Group lines until reaching maxChars (tokens * 4)
 * 3. When limit reached, flush chunk and carry overlap
 * 4. Overlap preserves context between chunks
 *
 * @param content - Markdown content to chunk
 * @param chunking - Configuration (tokens per chunk, overlap tokens)
 * @returns Array of chunks with line numbers and text
 */
export function chunkMarkdown(
  content: string,
  chunking: ChunkingConfig
): MemoryChunk[] {
  const lines = content.split("\n");

  if (lines.length === 0) {
    return [];
  }

  // Convert tokens to approximate chars (1 token ≈ 4 chars)
  const maxChars = Math.max(32, chunking.tokens * 4);
  const overlapChars = Math.max(0, chunking.overlap * 4);

  const chunks: MemoryChunk[] = [];
  let current: Array<{ line: string; lineNo: number }> = [];
  let currentChars = 0;

  /**
   * Flush current chunk to results
   */
  const flush = () => {
    if (current.length === 0) return;

    const firstEntry = current[0];
    const lastEntry = current[current.length - 1];
    if (!firstEntry || !lastEntry) return;

    const text = current.map((entry) => entry.line).join("\n");
    const startLine = firstEntry.lineNo;
    const endLine = lastEntry.lineNo;

    chunks.push({
      id: "", // Will be set by manager
      path: "", // Will be set by manager
      source: "memory",
      startLine,
      endLine,
      text,
      hash: hashText(text),
    });
  };

  /**
   * Carry overlap from current chunk to next
   * Keeps last N chars of current chunk
   */
  const carryOverlap = () => {
    if (overlapChars <= 0 || current.length === 0) {
      current = [];
      currentChars = 0;
      return;
    }

    let acc = 0;
    const kept: Array<{ line: string; lineNo: number }> = [];

    // Walk backwards, keeping lines until we have enough overlap
    for (let i = current.length - 1; i >= 0; i -= 1) {
      const entry = current[i];
      if (!entry) continue;

      acc += entry.line.length + 1; // +1 for newline
      kept.unshift(entry);

      if (acc >= overlapChars) break;
    }

    current = kept;
    currentChars = kept.reduce(
      (sum, entry) => sum + entry.line.length + 1,
      0
    );
  };

  // Process each line
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const lineNo = i + 1;

    // Handle very long lines (split into segments)
    const segments: string[] = [];
    if (line.length === 0) {
      segments.push("");
    } else {
      for (let start = 0; start < line.length; start += maxChars) {
        segments.push(line.slice(start, start + maxChars));
      }
    }

    // Add each segment
    for (const segment of segments) {
      const lineSize = segment.length + 1; // +1 for newline

      // Check if adding this line exceeds limit
      if (currentChars + lineSize > maxChars && current.length > 0) {
        flush();
        carryOverlap();
      }

      current.push({ line: segment, lineNo });
      currentChars += lineSize;
    }
  }

  // Flush final chunk
  flush();

  return chunks;
}

/**
 * Parse embedding from JSON string
 */
export function parseEmbedding(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw) as number[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Calculate cosine similarity between two vectors
 * Returns value between 0 (orthogonal) and 1 (identical)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
