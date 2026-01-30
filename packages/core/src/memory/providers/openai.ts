/**
 * OpenAI embedding provider
 *
 * Uses OpenAI's text-embedding-3-small model (1536 dimensions)
 * API docs: https://platform.openai.com/docs/guides/embeddings
 */

import type { EmbeddingProvider } from "../manager.js";

export const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

export interface OpenAIEmbeddingConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

/**
 * Create OpenAI embedding provider
 */
export function createOpenAIEmbeddingProvider(
  config: OpenAIEmbeddingConfig
): EmbeddingProvider {
  const model = config.model ?? DEFAULT_OPENAI_EMBEDDING_MODEL;
  const baseUrl = config.baseUrl ?? DEFAULT_OPENAI_BASE_URL;
  const url = `${baseUrl.replace(/\/$/, "")}/embeddings`;

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${config.apiKey}`,
  };

  return {
    model,
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return [];

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          input: texts,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenAI embeddings failed: ${response.status} ${text}`);
      }

      const payload = (await response.json()) as {
        data?: Array<{ embedding?: number[] }>;
      };

      const data = payload.data ?? [];
      return data.map((entry) => entry.embedding ?? []);
    },
  };
}
