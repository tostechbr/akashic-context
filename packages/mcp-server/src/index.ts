import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import {
  MemoryManager,
  createOpenAIEmbeddingProvider,
  type EmbeddingProvider
} from "akashic-context";
import { z } from "zod";

/**
 * Configuration for the MCP Server
 */
export interface McpServerConfig {
  /** Directory containing MEMORY.md and memory/*.md files */
  workspaceDir: string;
  /** Path to SQLite database (default: ./memory.db) */
  dbPath?: string;
  /** Embedding provider configuration */
  embedding?: {
    provider: "openai" | "local";
    apiKey?: string;
    model?: string;
  };
  /** Hybrid search weights */
  hybridWeights?: {
    vector: number;
    text: number;
  };
}

/**
 * MCP Server for Akashic Context
 * Exposes memory search and retrieval tools via Model Context Protocol
 */
export class MemoryMcpServer {
  private server: Server;
  private manager: MemoryManager;
  private workspaceDir: string;

  constructor(config: McpServerConfig) {
    this.workspaceDir = config.workspaceDir;
    // Initialize Memory Manager
    const dataDir = config.dbPath ? config.dbPath.replace(/\/[^/]+$/, '') : "./data";
    this.manager = new MemoryManager({
      dataDir,
      userId: "mcp-user",
      workspaceDir: config.workspaceDir,
      memory: {
        enabled: true,
        provider: config.embedding?.provider || "openai",
        model: config.embedding?.model || "text-embedding-3-small",
        chunkSize: 400,
        chunkOverlap: 80,
        vectorWeight: config.hybridWeights?.vector || 0.7,
        textWeight: config.hybridWeights?.text || 0.3,
        minScore: 0.35,
      },
    });

    // Configure embedding provider if specified
    if (config.embedding) {
      this.setupEmbeddingProvider(config.embedding);
    }

    // Initialize MCP Server
    this.server = new Server(
      {
        name: "akashic-context",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  /**
   * Setup embedding provider based on config
   */
  private setupEmbeddingProvider(config: McpServerConfig["embedding"]): void {
    if (!config) return;

    // Helper to create mock provider
    const createMockProvider = (reason: string) => {
      console.error(`[MCP] Using mock embeddings: ${reason} (keyword-only search)`);
      this.manager.setEmbeddingProvider({
        model: "mock",
        embed: async (texts: string[]) => {
          // Return random normalized vectors (BM25 keyword search still works)
          return texts.map(() => {
            const vec = Array(1536).fill(0).map(() => Math.random());
            const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
            return vec.map(v => v / norm);
          });
        }
      });
    };

    if (config.provider === "openai") {
      const apiKey = config.apiKey || process.env.OPENAI_API_KEY;

      // Check if API key is missing or is a test/mock value
      if (!apiKey || apiKey === "mock" || apiKey === "test" || apiKey.startsWith("mock-") || apiKey.startsWith("test-")) {
        createMockProvider("no valid API key");
        return;
      }

      // Use real OpenAI provider
      const provider = createOpenAIEmbeddingProvider({
        apiKey,
        model: config.model,
      });

      this.manager.setEmbeddingProvider(provider);
      console.error(`[MCP] Embedding provider: OpenAI (${config.model || "text-embedding-3-small"})`);
    } else {
      createMockProvider(`provider=${config.provider}`);
    }
  }

  /**
   * Register tool handlers
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "memory_search",
          description:
            "Search long-term conversation memory using hybrid vector + keyword search. " +
            "Searches across MEMORY.md and memory/*.md files in the workspace.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query (semantic or keyword)",
              },
              maxResults: {
                type: "number",
                description: "Maximum number of results to return (default: 6)",
                default: 6,
              },
              minScore: {
                type: "number",
                description: "Minimum relevance score threshold 0-1 (default: 0.35)",
                default: 0.35,
              },
            },
            required: ["query"],
          },
        },
        {
          name: "memory_get",
          description:
            "Retrieve specific lines from a memory file. " +
            "Use this after memory_search to get full content of relevant sections.",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Relative path to memory file (e.g., 'memory/2025-01.md')",
              },
              from: {
                type: "number",
                description: "Starting line number (1-based, optional)",
              },
              lines: {
                type: "number",
                description: "Number of lines to read (optional, default: all)",
              },
            },
            required: ["path"],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request: CallToolRequest) => {
        const { name, arguments: args } = request.params;

        try {
          switch (name) {
            case "memory_search":
              return await this.handleMemorySearch(args);
            case "memory_get":
              return await this.handleMemoryGet(args);
            default:
              throw new Error(`Unknown tool: ${name}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text",
                text: `Error: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  /**
   * Handle memory_search tool call
   */
  private async handleMemorySearch(args: unknown) {
    const schema = z.object({
      query: z.string(),
      maxResults: z.number().optional().default(6),
      minScore: z.number().optional().default(0.35),
    });

    const { query, maxResults, minScore } = schema.parse(args);

    if (!query || query.trim().length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Query cannot be empty",
          },
        ],
        isError: true,
      };
    }

    // Perform search
    const results = await this.manager.search(query, {
      maxResults,
      minScore,
    });

    // Format results
    const formatted = results.map((result, idx) => ({
      rank: idx + 1,
      path: result.path,
      lines: `${result.startLine}-${result.endLine}`,
      score: result.score.toFixed(3),
      snippet: result.snippet,
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              query,
              resultCount: results.length,
              results: formatted,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  /**
   * Handle memory_get tool call
   * Safely reads files from the workspace directory with path traversal protection
   */
  private async handleMemoryGet(args: unknown) {
    const schema = z.object({
      path: z.string(),
      from: z.number().optional(),
      lines: z.number().optional(),
    });

    const { path, from, lines } = schema.parse(args);

    const fs = await import("node:fs/promises");
    const { resolve, normalize } = await import("node:path");

    try {
      // Normalize path and remove any ".." components
      const safePath = normalize(path).replace(/^(\.\.(\/|\\|$))+/, '');

      // Resolve absolute paths
      const workspaceAbsPath = resolve(this.workspaceDir);
      const requestedAbsPath = resolve(workspaceAbsPath, safePath);

      // Security check: Ensure the resolved path is within workspace
      if (!requestedAbsPath.startsWith(workspaceAbsPath + "/") &&
        requestedAbsPath !== workspaceAbsPath) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Path outside workspace directory is not allowed",
            },
          ],
          isError: true,
        };
      }

      // Check file size to prevent OOM (10MB limit)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      const stats = await fs.stat(requestedAbsPath);

      if (stats.size > MAX_FILE_SIZE) {
        return {
          content: [
            {
              type: "text",
              text: `Error: File too large (${(stats.size / 1024 / 1024).toFixed(2)}MB > 10MB limit)`,
            },
          ],
          isError: true,
        };
      }

      // Safe to read file
      const content = await fs.readFile(requestedAbsPath, "utf-8");
      const allLines = content.split("\n");

      let selectedLines = allLines;
      if (from !== undefined) {
        const start = Math.max(0, from - 1); // Convert to 0-based
        const end = lines ? start + lines : undefined;
        selectedLines = allLines.slice(start, end);
      }

      return {
        content: [
          {
            type: "text",
            text: selectedLines.join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    // Sync memory files before starting (index them)
    console.error("Indexing memory files...");
    try {
      await this.manager.sync();
      const chunkCount = this.manager.getChunkCount();
      console.error(`Indexed ${chunkCount} chunks from memory files`);
    } catch (error) {
      console.error("Warning: Failed to sync memory files:", error instanceof Error ? error.message : error);
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Memory MCP Server started on stdio");
  }

  /**
   * Close the server and cleanup resources
   */
  async close(): Promise<void> {
    await this.manager.close();
    await this.server.close();
  }
}
