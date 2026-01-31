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
└── core/                    # Biblioteca principal
    └── src/
        ├── memory/          # Memory system
        │   ├── chunking.ts  # Markdown chunking com overlap
        │   ├── hybrid.ts    # Hybrid search (vector + BM25)
        │   ├── storage.ts   # SQLite storage layer
        │   ├── manager.ts   # Memory Manager
        │   └── providers/   # Embedding providers (OpenAI, etc.)
        ├── context/         # Context management (TODO)
        ├── utils/           # Utilities (hash, tokens, files)
        ├── types.ts         # Core type definitions
        └── index.ts         # Main exports
```

## Comandos

```bash
pnpm install          # Instalar dependências
pnpm build            # Compilar TypeScript (ESM + CJS + DTS)
pnpm test             # Rodar testes (Vitest)
pnpm test --run       # Rodar testes sem watch mode
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

### Memory System
- **Chunking**: Divide markdown em chunks (~400 tokens, 80 overlap)
- **Storage**: SQLite com FTS5 (keyword) + sqlite-vec (vector)
- **Hybrid Search**: 70% vector + 30% keyword scoring
- **Embedding Cache**: Deduplicação por hash

### Context Management (TODO)
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

- [x] Phase 1 Week 1: Memory System (90%)
  - [x] Project setup
  - [x] Core types
  - [x] Chunking algorithm
  - [x] Hybrid search
  - [x] SQLite storage
  - [x] Memory Manager
  - [x] OpenAI embedding provider
  - [x] Testes básicos (46 passando)
  - [ ] Testes de storage (aguardando better-sqlite3)
- [ ] Phase 1 Week 2: Context Manager
- [ ] Phase 1 Week 3: Engine integration
- [ ] Phase 2: CLI Tool
- [ ] Phase 3: Examples & Docs

## Links

- **Repo**: https://github.com/tostechbr/memory-context-engine
- **Baseado em**: [Moltbot](https://github.com/moltbot/moltbot)
