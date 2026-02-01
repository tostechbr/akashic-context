# Akashic Context

Biblioteca open-source para adicionar memória persistente a agentes de IA.

## Estrutura do Projeto

```
packages/
├── core/                    # Biblioteca principal
│   └── src/
│       ├── memory/          # Memory system
│       │   ├── chunking.ts  # Markdown chunking com overlap
│       │   ├── hybrid.ts    # Hybrid search (BM25)
│       │   ├── storage.ts   # SQLite storage layer
│       │   ├── manager.ts   # Memory Manager
│       │   └── providers/   # Embedding providers
│       ├── utils/           # Utilities (hash, tokens, files)
│       ├── types.ts         # Core type definitions
│       └── index.ts         # Main exports
│
└── mcp-server/              # MCP Server adapter
    └── src/
        ├── index.ts         # MCP Server implementation
        └── cli.ts           # CLI entry point
```

## Comandos

```bash
pnpm install          # Instalar dependências
pnpm build            # Compilar todos os packages
pnpm test             # Rodar testes (Vitest)
pnpm test -- --run    # Rodar testes sem watch mode
```

### MCP Server

```bash
cd packages/mcp-server
pnpm build            # Compilar MCP Server
node test-simple.js   # Testar localmente
```

## Uso

### Como Biblioteca

```typescript
import { MemoryManager } from "akashic-context";

const manager = new MemoryManager({
  workspaceDir: "./workspace",
  dbPath: "./memory.db"
});

await manager.sync();

const results = await manager.search("projeto X", {
  maxResults: 5,
  minScore: 0
});
```

### Como MCP Server

#### Claude Desktop

Adicionar em `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/path/to/akashic-context/packages/mcp-server/dist/cli.js"],
      "env": {
        "MEMORY_WORKSPACE_DIR": "/path/to/workspace"
      }
    }
  }
}
```

#### n8n

Usar o wrapper script:

```
Command: bash
Arguments: /path/to/akashic-context/packages/mcp-server/run-server.sh
```

Editar `run-server.sh` para apontar para seu workspace.

## Convenções de Código

- **Linguagem**: TypeScript ESM, strict mode
- **Runtime**: Node 18+
- **Arquivos**: Manter < 500 LOC quando possível
- **Testes**: Colocados como `*.test.ts` junto ao código
- **Imports**: Usar extensão `.js` nos imports (ESM)
- **Types**: Evitar `any`, preferir tipos explícitos

## Arquitetura

```
┌─────────────────────────────────────────────┐
│              Core Library                    │
│  (packages/core)                            │
│                                             │
│  • MemoryManager - Orchestration            │
│  • HybridSearch - Keyword (BM25)            │
│  • MemoryStorage - SQLite + FTS5            │
│  • Zero framework dependencies              │
└─────────────────────────────────────────────┘
                    ↑
                    │
            ┌───────┴───────┐
            │  MCP Server   │
            │  (stdio)      │
            └───────────────┘
                    ↑
                    │
            ┌───────┴───────┐
            │  Claude       │
            │  Cursor       │
            │  n8n (local)  │
            └───────────────┘
```

### Memory System
- **Chunking**: Divide markdown em chunks (~400 tokens, 80 overlap)
- **Storage**: SQLite com FTS5 (keyword search)
- **Hybrid Search**: BM25 keyword scoring
- **Embedding Cache**: Deduplicação por hash

### MCP Server
- **Tools**: `memory_search`, `memory_get`
- **Transport**: stdio
- **Configuration**: Environment variables ou CLI flags

## Status

### Implementado
- [x] Core memory system
- [x] Chunking algorithm
- [x] SQLite storage com FTS5
- [x] BM25 keyword search
- [x] MCP Server
- [x] Integração com n8n, Claude Desktop, Cursor

### Roadmap
- [ ] Vector search (sqlite-vec)
- [ ] HTTP API adapter
- [ ] Mais embedding providers

## Troubleshooting

### "Could not locate the bindings file" (better-sqlite3)

Native module não compilado:

```bash
cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3
npm run build-release
```

### MCP Server não inicia

1. Verificar se workspace directory existe
2. Verificar stderr para erros
3. Testar com `node packages/mcp-server/dist/cli.js --workspace=/path`

### Busca retorna 0 resultados

1. Verificar se arquivos MEMORY.md ou memory/*.md existem
2. Verificar se `minScore` não está muito alto (usar 0 para ver todos)
3. Deletar database para forçar reindex: `rm -f memory.db`

## Links

- **Repo**: https://github.com/tostechbr/akashic-context
- **Docs**: [README.md](./README.md)
- **Testing**: [docs/TESTING.md](./docs/TESTING.md)
- **MCP Protocol**: https://modelcontextprotocol.io
