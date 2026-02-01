#!/usr/bin/env node

import { MemoryMcpServer } from "./index.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    workspaceDir: process.env.MEMORY_WORKSPACE_DIR || process.cwd(),
    dbPath: process.env.MEMORY_DB_PATH || "./memory.db",
    embedding: {
      provider: (process.env.MEMORY_EMBEDDING_PROVIDER || "openai") as "openai" | "local",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.MEMORY_EMBEDDING_MODEL,
    },
  };

  // Parse command line args (simple key=value format)
  for (const arg of args) {
    const [key, value] = arg.split("=");
    if (key === "--workspace") config.workspaceDir = value;
    if (key === "--db") config.dbPath = value;
    if (key === "--provider") config.embedding.provider = value as "openai" | "local";
  }

  return config;
}

/**
 * Main entry point
 */
async function main() {
  const config = parseArgs();

  console.error("Starting Memory MCP Server...");
  console.error(`Workspace: ${config.workspaceDir}`);
  console.error(`Database: ${config.dbPath}`);
  console.error(`Embedding: ${config.embedding.provider}`);

  const server = new MemoryMcpServer(config);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.error("\nShutting down...");
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("\nShutting down...");
    await server.close();
    process.exit(0);
  });

  // Start server
  await server.start();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
