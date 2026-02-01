<div align="center">

# Akashic Context

**Universal Memory & Context Engine for LLMs**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Protocol](https://img.shields.io/badge/Protocol-MCP-orange)](https://modelcontextprotocol.io)

</div>

> "Akashic Context" implies a universal, infinite context for your AI.

Akashic Context is an open-source library that adds persistent memory to AI agents. Your agents can remember past conversations, decisions, and context across sessions.

## Why?

AI agents forget everything after each conversation. This library solves that by:

- **Storing memories** in simple Markdown files (human-readable, git-friendly)
- **Searching intelligently** using keyword matching (BM25)
- **Integrating easily** via MCP Protocol (works with n8n, Claude Desktop, Cursor)

## Quick Start with n8n

### 1. Clone and Build

```bash
git clone https://github.com/tostechbr/akashic-context.git
cd akashic-context
pnpm install
pnpm build
```

### 2. Create Your Memory Files

Create a workspace folder with your memories:

```
my-workspace/
├── MEMORY.md           # Main memory file
└── memory/
    ├── projects.md     # Project notes
    ├── meetings.md     # Meeting notes
    └── ideas.md        # Ideas and thoughts
```

Example `MEMORY.md`:

```markdown
# My Memory

## About Me
I'm a developer working on AI projects.

## Current Projects
- Akashic Context - Adding memory to AI agents
- My App - A productivity tool

## Important Contacts
- John: john@email.com - Technical mentor
- Sarah: sarah@email.com - Design partner
```

### 3. Configure n8n

**Create MCP Credential:**

| Field | Value |
|-------|-------|
| Command | `bash` |
| Arguments | `/path/to/akashic-context/packages/mcp-server/run-server.sh` |
| Environments | `OPENAI_API_KEY=sk-your-key` |

**Edit `run-server.sh`** to point to your workspace:

```bash
WORKSPACE="/path/to/your/my-workspace"
```

### 4. Create Your Workflow

Import this workflow in n8n:

```json
{
  "nodes": [
    {
      "parameters": {},
      "type": "@n8n/n8n-nodes-langchain.chatTrigger",
      "name": "Chat Trigger"
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "={{ $json.chatInput }}",
        "options": {
          "systemMessage": "You are a personal assistant with access to the user's memory.\n\nWhen the user asks a question:\n1. Use memory_search to find relevant information\n2. Respond based on what you find\n\nIf you don't find information, say you don't have that in memory.\n\nRespond clearly and concisely."
        }
      },
      "type": "@n8n/n8n-nodes-langchain.agent",
      "name": "AI Agent"
    },
    {
      "parameters": {
        "model": "gpt-4.1-mini"
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "name": "OpenAI Chat Model"
    },
    {
      "parameters": {
        "operation": "executeTool",
        "toolName": "memory_search",
        "toolParameters": "{\"query\": \"{{ $json.chatInput.replace(/\\n/g, ' ').trim() }}\", \"minScore\": 0}"
      },
      "type": "n8n-nodes-mcp.mcpClientTool",
      "name": "MCP Client"
    }
  ]
}
```

### 5. Test It!

Ask your agent:
- "What projects am I working on?"
- "Who is my technical mentor?"
- "What are my current priorities?"

## How It Works

```
User Question → AI Agent → MCP Server → Search Memory → Response
                              ↓
                    MEMORY.md + memory/*.md
```

1. **You write** memories in Markdown files
2. **MCP Server** indexes and searches them
3. **AI Agent** uses the search results to answer questions

### Search Features

- **Keyword Search (BM25)**: Finds exact and related terms
- **Chunking**: Large files are split into searchable pieces
- **Ranking**: Results sorted by relevance score

## Available Tools

### `memory_search`

Search your memories.

```json
{
  "query": "project status",
  "maxResults": 5,
  "minScore": 0
}
```

### `memory_get`

Read a specific file.

```json
{
  "path": "memory/projects.md",
  "from": 1,
  "lines": 20
}
```

## Project Structure

```
akashic-context/
├── packages/
│   ├── core/           # Core library (search, storage, chunking)
│   └── mcp-server/     # MCP Server for AI agents
├── examples/           # Example workspaces
└── test-workspace-mcp/ # Test workspace
```

## Development

```bash
# Install
pnpm install

# Build
pnpm build

# Test
pnpm test

# Run MCP Server locally
cd packages/mcp-server
node test-simple.js
```

See [Testing Guide](./docs/TESTING.md) for detailed testing instructions.

## Roadmap

- [x] Core memory system
- [x] MCP Server integration
- [x] n8n integration
- [x] Keyword search (BM25)
- [ ] Vector search (semantic similarity)

## Current Limitations

- **Local only**: MCP uses stdio, so it works with local n8n. Cloud integration requires HTTP adapter (coming soon).
- **Keyword search**: Currently uses BM25 keyword matching. Vector search for semantic similarity is in development.

## Contributing

Contributions are welcome! This is an open-source project.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas We Need Help

- Vector search implementation (sqlite-vec)
- Claude Desktop integration testing
- Documentation improvements
- More embedding providers

## Security

- **Path Traversal Protection**: Cannot read files outside workspace
- **File Size Limits**: 10MB max per file
- **No Hardcoded Secrets**: Uses environment variables

## License

MIT License - See [LICENSE](./LICENSE) for details.

## Credits

Extracted from [Moltbot](https://github.com/moltbot/moltbot), an open-source AI assistant.

## Author

**Tiago Santos** - [@tostechbr](https://github.com/tostechbr)

---

*Give your AI agents the gift of memory.*
