/**
 * Token estimation utilities
 *
 * Note: These are approximations. For exact counts, use tiktoken.
 */

/**
 * Estimate token count for text
 * Rule of thumb: ~1 token per 4 characters for English text
 *
 * For exact counts, use tiktoken library:
 * ```typescript
 * import { encodingForModel } from "tiktoken";
 * const enc = encodingForModel("gpt-4");
 * const tokens = enc.encode(text);
 * const count = tokens.length;
 * enc.free();
 * ```
 */
export function estimateTokens(text: string): number {
  // Simple approximation: 1 token ≈ 4 chars
  return Math.ceil(text.length / 4);
}

/**
 * Convert tokens to approximate character count
 */
export function tokensToChars(tokens: number): number {
  return tokens * 4;
}

/**
 * Convert characters to approximate token count
 */
export function charsToTokens(chars: number): number {
  return Math.ceil(chars / 4);
}
