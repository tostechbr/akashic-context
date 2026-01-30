/**
 * Hash utilities for content deduplication
 */

import { createHash } from "node:crypto";

/**
 * Generate SHA256 hash of text content
 * Used for detecting file/chunk changes and deduplication
 */
export function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Generate stable ID from multiple components
 */
export function hashComponents(...components: string[]): string {
  return hashText(components.join(":"));
}
