/**
 * File system utilities
 */

import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

/**
 * Check if file/directory exists
 */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure directory exists (create if needed)
 */
export function ensureDir(dir: string): string {
  try {
    fsSync.mkdirSync(dir, { recursive: true });
  } catch {}
  return dir;
}

/**
 * Normalize relative path (remove leading ./ and backslashes)
 */
export function normalizeRelPath(value: string): string {
  const trimmed = value.trim().replace(/^[./]+/, "");
  return trimmed.replace(/\\/g, "/");
}

/**
 * Check if path is a memory file (MEMORY.md or memory/*.md)
 */
export function isMemoryPath(relPath: string): boolean {
  const normalized = normalizeRelPath(relPath);
  if (!normalized) return false;
  if (normalized === "MEMORY.md" || normalized === "memory.md") return true;
  return normalized.startsWith("memory/");
}

/**
 * Recursively walk directory and collect .md files
 */
async function walkDir(dir: string, files: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walkDir(full, files);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".md")) continue;

    files.push(full);
  }
}

/**
 * List all memory files in workspace
 * Returns: MEMORY.md (if exists) + all .md files in memory/ directory
 */
export async function listMemoryFiles(workspaceDir: string): Promise<string[]> {
  const result: string[] = [];

  // Check for MEMORY.md (case variations)
  const memoryFile = path.join(workspaceDir, "MEMORY.md");
  const altMemoryFile = path.join(workspaceDir, "memory.md");

  if (await exists(memoryFile)) result.push(memoryFile);
  if (await exists(altMemoryFile)) result.push(altMemoryFile);

  // Check for memory/ directory
  const memoryDir = path.join(workspaceDir, "memory");
  if (await exists(memoryDir)) {
    await walkDir(memoryDir, result);
  }

  // Deduplicate (handle symlinks)
  if (result.length <= 1) return result;

  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const entry of result) {
    let key = entry;
    try {
      key = await fs.realpath(entry);
    } catch {}

    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }

  return deduped;
}
