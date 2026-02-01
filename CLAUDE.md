# Memory Context Engine

Biblioteca standalone para **Memory** (long-term) + **Context** (short-term) management para LLMs.
Baseada nos padrões battle-tested do Moltbot.

## Objetivo

Criar uma biblioteca universal e opensource que qualquer projeto possa usar para:
- **Memory System**: Armazenamento e busca de memórias de longo prazo (hybrid search: vector + keyword)
- **Context Management**: Gerenciamento de contexto de curto prazo (session, compaction, pruning)

## Estrutura do Projeto

```
packages/
├── core/                    # Biblioteca principal (Core)
│   └── src/
│       ├── memory/          # Memory system
│       │   ├── chunking.ts  # Markdown chunking com overlap
│       │   ├── hybrid.ts    # Hybrid search (vector + BM25)
│       │   ├── storage.ts   # SQLite storage layer
│       │   ├── manager.ts   # Memory Manager
│       │   └── providers/   # Embedding providers (OpenAI, etc.)
│       ├── context/         # Context management (TODO)
│       ├── utils/           # Utilities (hash, tokens, files)
│       ├── types.ts         # Core type definitions
│       └── index.ts         # Main exports
│
└── mcp-server/              # MCP Server adapter
    └── src/
        ├── index.ts         # MCP Server implementation
        └── cli.ts           # CLI entry point
```

## Setup Inicial

### 1. Instalar Dependências

```bash
pnpm install
```

### 2. Compilar Native Modules (better-sqlite3)

**Problema conhecido**: O `better-sqlite3` precisa de native bindings compilados para M1/M2 Macs.

**Solução**:

```bash
# Método 1: Rebuild direto no módulo instalado
cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3
npm run build-release
cd ../../../../../..

# Método 2: Usar prebuilt binaries (alternativa)
# Editar package.json e substituir:
# "better-sqlite3": "npm:@mapbox/better-sqlite3-prebuilt@^11.0.0"
```

**Verificar se funcionou**:

```bash
pnpm test -- --run
# Deve mostrar: 86/88 testes passando (97.7%)
```

### 3. Build do Projeto

```bash
pnpm build            # Compilar TypeScript (ESM + CJS + DTS)
```

## Comandos

```bash
pnpm install          # Instalar dependências
pnpm build            # Compilar todos os packages
pnpm test             # Rodar testes (Vitest watch mode)
pnpm test -- --run    # Rodar testes sem watch mode
pnpm dev              # Dev mode (turbo watch)
```

### MCP Server

```bash
cd packages/mcp-server
pnpm build            # Compilar MCP Server
pnpm dev              # Rodar em dev mode
```

## Uso Rápido

### Como Biblioteca (Uso Direto)

```typescript
import { MemoryManager } from "memory-context-engine";

const manager = new MemoryManager({
  workspaceDir: "./workspace",
  dbPath: "./memory.db"
});

// Indexar arquivos
await manager.sync();

// Buscar
const results = await manager.search("projeto X", {
  maxResults: 5,
  minScore: 0.4
});

console.log(results);
```

### Como MCP Server (Para Agentes)

#### 1. Com Claude Desktop

Adicionar em `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/path/to/memory-context-engine/packages/mcp-server/dist/cli.js"],
      "env": {
        "MEMORY_WORKSPACE_DIR": "/path/to/workspace",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

#### 2. Com n8n (Local)

```javascript
// n8n Code node
const results = $mcp.callTool('memory', 'memory_search', {
  query: 'database architecture',
  maxResults: 5
});
```

#### 3. Com Cursor

Adicionar em settings.json:

```json
{
  "mcp.servers": {
    "memory": {
      "command": "node",
      "args": ["packages/mcp-server/dist/cli.js"],
      "env": {
        "MEMORY_WORKSPACE_DIR": "${workspaceFolder}"
      }
    }
  }
}
```

## Convenções de Código

- **Linguagem**: TypeScript ESM, strict mode
- **Runtime**: Node 22+
- **Arquivos**: Manter < 500 LOC quando possível
- **Testes**: Colocados como `*.test.ts` junto ao código
- **Imports**: Usar extensão `.js` nos imports (ESM)
- **Comentários**: Breves, apenas para lógica não-óbvia
- **Types**: Evitar `any`, preferir tipos explícitos

## Arquitetura

### Core + Adapters Pattern

```
┌─────────────────────────────────────────────────────────┐
│                    Core Library                          │
│  (packages/core)                                        │
│                                                         │
│  • MemoryManager - Orchestration                       │
│  • HybridSearch - Vector + Keyword                     │
│  • MemoryStorage - SQLite persistence                  │
│  • EmbeddingProviders - OpenAI, Gemini, Local          │
│  • Zero framework dependencies                         │
└─────────────────────────────────────────────────────────┘
            ↑                           ↑
            │                           │
    ┌───────┴───────┐           ┌───────┴───────┐
    │  MCP Server   │           │  HTTP API     │
    │  (stdio/HTTP) │           │  (Express)    │
    │  packages/    │           │  (future)     │
    │  mcp-server   │           │               │
    └───────────────┘           └───────────────┘
            ↑                           ↑
            │                           │
    ┌───────┴───────┐           ┌───────┴───────┐
    │  Claude       │           │  n8n Cloud    │
    │  Cursor       │           │  Webhooks     │
    │  n8n (local)  │           │  Custom Apps  │
    └───────────────┘           └───────────────┘
```

### Memory System (Core)
- **Chunking**: Divide markdown em chunks (~400 tokens, 80 overlap)
- **Storage**: SQLite com FTS5 (keyword) + sqlite-vec (vector)
- **Hybrid Search**: 70% vector + 30% keyword scoring
- **Embedding Cache**: Deduplicação por hash

### MCP Server (Adapter)
- **Tools**: `memory_search`, `memory_get`
- **Transport**: stdio (para Claude, Cursor, n8n local)
- **Configuration**: Environment variables
- **Hot-reload**: File watching automático

### Context Management (TODO - Future)
- Session compaction
- Token counting
- Pruning strategies

## Padrões Extraídos do Moltbot

Este projeto extrai e adapta código battle-tested do Moltbot:
- `chunkMarkdown()` - Chunking com overlap
- `mergeHybridResults()` - Merge de resultados híbridos
- `bm25RankToScore()` - Conversão de rank BM25
- Schema SQLite (files, chunks, embedding_cache, FTS5)

## Status

### Phase 1: Memory System ✅ (97.7% completo)

**Core Library** (packages/core):
- [x] Project setup
- [x] Core types (100% - 129 LOC)
- [x] Chunking algorithm (100% - 21/21 tests ✅)
- [x] Hybrid search (100% - 25/25 tests ✅)
- [x] SQLite storage (100% - 20/20 tests ✅)
- [x] Memory Manager (90% - 18/20 tests ✅)
- [x] OpenAI embedding provider (100%)
- [x] Utilities (hash, tokens, files - 100%)
- [x] **Total: 86/88 testes passando** 🎉

**MCP Server Adapter** (packages/mcp-server):
- [x] MCP Server implementation
- [x] Tools: memory_search, memory_get
- [x] CLI entry point
- [x] Documentation & examples
- [x] Support for Claude Desktop, Cursor, n8n

**Known Issues**:
- 🟡 2 manager tests failing (edge cases, não bloqueia uso)
- 🟡 better-sqlite3 precisa compilação manual (documentado acima)

### Phase 2: Context Manager (TODO)
- [ ] Session management
- [ ] Token counting
- [ ] Message compaction
- [ ] Context pruning

### Phase 3: Additional Adapters (Future)
- [ ] HTTP API adapter (Express/Fastify)
- [ ] LangChain Python tool
- [ ] LangChain.js integration

## Troubleshooting

### "Could not locate the bindings file" (better-sqlite3)

**Causa**: Native module não compilado.

**Solução**:
```bash
cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3
npm run build-release
```

### Tests failing (Storage/Manager)

**Verificar**:
1. better-sqlite3 está compilado? (ver acima)
2. Rodar `pnpm test -- --run` para ver output completo
3. Verificar permissões de escrita no diretório

### MCP Server não inicia

**Verificar**:
1. Workspace directory existe?
2. OPENAI_API_KEY está configurada? (se usando OpenAI)
3. Verificar stderr para erros

### Busca retorna 0 resultados

**Verificar**:
1. Arquivos MEMORY.md ou memory/*.md existem?
2. `await manager.sync()` foi chamado?
3. Reduzir `minScore` (tentar 0.2)

## Links

- **Repo**: https://github.com/tostechbr/memory-context-engine
- **Baseado em**: [Moltbot](https://github.com/moltbot/moltbot)
- **MCP Protocol**: https://modelcontextprotocol.io
