# Testing Guide

## Quick Test (Command Line)

Test the MCP server directly without n8n:

```bash
cd packages/mcp-server
node test-simple.js
```

This will:
1. Index all memory files in the workspace
2. Run a test search
3. Show the results

## Test with n8n

### 1. Start n8n

```bash
n8n start
```

### 2. Configure MCP Credential

Go to **Settings > Credentials > Add Credential > MCP Client**

| Field | Value |
|-------|-------|
| Command | `bash` |
| Arguments | `/path/to/akashic-context/packages/mcp-server/run-server.sh` |

### 3. Test Tool Execution

Create a simple workflow:

1. Add **Manual Trigger** node
2. Add **MCP Client** node
3. Configure MCP Client:
   - Operation: `Execute Tool`
   - Tool Name: `memory_search`
   - Tool Parameters: `{"query": "projetos", "minScore": 0}`

4. Execute the workflow

### 4. Expected Results

You should see results like:

```json
{
  "results": [
    {
      "content": "# Meus Projetos\n\n## Memory Context Engine...",
      "source": "memory/projetos.md",
      "score": 0.85
    }
  ],
  "totalResults": 3
}
```

## Test Queries

Try these searches to verify the memory system:

| Query | Expected Result |
|-------|-----------------|
| `projetos` | Project information |
| `Carlos` | Contact and meeting info |
| `Janeiro 2026` | Schedule/agenda items |
| `Moltbot` | Moltbot project details |
| `aniversario` | Birthday dates |

## Troubleshooting

### No results returned

1. Check if files exist in workspace:
   ```bash
   ls -la test-workspace-mcp/
   ls -la test-workspace-mcp/memory/
   ```

2. Check MCP server logs (stderr output in n8n)

3. Try with `minScore: 0` to see all results

### Connection errors

1. Verify the path in `run-server.sh`:
   ```bash
   cat packages/mcp-server/run-server.sh
   ```

2. Test the script directly:
   ```bash
   bash packages/mcp-server/run-server.sh
   ```

3. Check Node.js version (requires 18+):
   ```bash
   node --version
   ```

### Database issues

Delete the database to force reindex:

```bash
rm -f test-workspace-mcp/memory.db
```

## Unit Tests

Run the test suite:

```bash
pnpm test
```

Run with coverage:

```bash
pnpm test -- --coverage
```
