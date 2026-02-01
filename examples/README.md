# Memory Context Engine - Examples

Este diretório contém exemplos de uso do Memory Context Engine.

## test-workspace/

Workspace de exemplo com arquivos de memória para testar o sistema.

Contém:
- `MEMORY.md` - Memória principal do projeto
- `memory/2025-01-architecture.md` - Decisões de arquitetura

Use este workspace para testar:
- MCP Server
- Core library
- Hybrid search

## Testar MCP Server

Ver `test-mcp-server.md` para instruções completas.

**Quick start**:

```bash
# 1. Build do core e MCP server
pnpm build

# 2. Iniciar MCP server
cd packages/mcp-server
export MEMORY_WORKSPACE_DIR=../../examples/test-workspace
export OPENAI_API_KEY=sk-...
pnpm dev
```

## Testar Core Library

```typescript
import { MemoryManager } from "memory-context-engine";

const manager = new MemoryManager({
  dataDir: "./data",
  userId: "test-user",
  workspaceDir: "./examples/test-workspace",
  memory: {
    enabled: true,
    provider: "openai",
    model: "text-embedding-3-small",
    chunkSize: 400,
    chunkOverlap: 80,
  },
});

// Indexar arquivos
await manager.sync();

// Buscar
const results = await manager.search("architecture", {
  maxResults: 5,
  minScore: 0.4,
});

console.log(results);
```

## Estrutura Esperada do Workspace

```
workspace/
├── MEMORY.md                 # Memória principal (opcional)
└── memory/                   # Diretório de memórias
    ├── 2025-01-topic1.md
    ├── 2025-01-topic2.md
    └── ...
```

O sistema indexa automaticamente:
- `MEMORY.md` (se existir)
- Todos os arquivos `.md` em `memory/`
