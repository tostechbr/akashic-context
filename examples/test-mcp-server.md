# Testing MCP Server

## Manual Test

1. **Start MCP Server**:

```bash
cd packages/mcp-server
export MEMORY_WORKSPACE_DIR=../../examples/test-workspace
export OPENAI_API_KEY=your-key-here
pnpm dev
```

2. **Test with Claude Desktop**:

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/absolute/path/to/memory-context-engine/packages/mcp-server/dist/cli.js"],
      "env": {
        "MEMORY_WORKSPACE_DIR": "/absolute/path/to/memory-context-engine/examples/test-workspace",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

3. **Ask Claude**:

```
Search memory for "architecture decisions"
```

Claude should call `memory_search` and return results from the test workspace.

## Expected Results

When searching for "architecture decisions", you should see:
- Results from `memory/2025-01-architecture.md`
- Score > 0.7 (high relevance)
- Snippet containing "Core + Adapters Pattern"

When searching for "hybrid search", you should see:
- Results from `MEMORY.md`
- Details about 70% vector + 30% keyword weighting

## Troubleshooting

### Server won't start
- Check OPENAI_API_KEY is set
- Check workspace directory exists
- Look at stderr for error messages

### No search results
- Run `sync()` first (server does this on startup)
- Check memory files exist in workspace
- Lower minScore (try 0.2)

### Build errors
- Ensure better-sqlite3 is compiled (see CLAUDE.md)
- Run `pnpm build` in core package first
- Check tsconfig.json exists
