#!/usr/bin/env node

import { MemoryMcpServer } from "./index.js";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

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
    const [key, ...rest] = arg.split("=");
    const value = rest.join("="); // Handle values that contain =
    if (key === "--workspace") config.workspaceDir = value;
    if (key === "--db") config.dbPath = value;
    if (key === "--provider") config.embedding.provider = value as "openai" | "local";
  }

  // Resolve workspace to absolute path
  config.workspaceDir = resolve(config.workspaceDir);

  return config;
}

/**
 * Main entry point
 */
async function main() {
  const config = parseArgs();

  console.error("[MCP] Starting Memory MCP Server...");
  console.error(`[MCP] Workspace: ${config.workspaceDir}`);
  console.error(`[MCP] Database: ${config.dbPath}`);
  console.error(`[MCP] Embedding: ${config.embedding.provider}`);
  console.error(`[MCP] API Key: ${config.embedding.apiKey ? "present" : "not set"}`);

  // Validate workspace exists
  if (!existsSync(config.workspaceDir)) {
    console.error(`[MCP] ERROR: Workspace directory does not exist: ${config.workspaceDir}`);
    process.exit(1);
  }

  const server = new MemoryMcpServer(config);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.error("[MCP] Received SIGINT, shutting down...");
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("[MCP] Received SIGTERM, shutting down...");
    await server.close();
    process.exit(0);
  });

  // Handle uncaught errors
  process.on("uncaughtException", (error) => {
    console.error("[MCP] Uncaught exception:", error);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("[MCP] Unhandled rejection:", reason);
  });

  // Start server
  console.error("[MCP] Initializing server...");
  await server.start();
  console.error("[MCP] Server running, waiting for requests...");
}

main().catch((error) => {
  console.error("[MCP] Fatal error:", error);
  process.exit(1);
});
