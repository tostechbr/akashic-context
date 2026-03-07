# Sprint 1 Design — Vector Search + memory_add

> Criado: 2026-03-07
> Status: ✅ Aprovado — pronto para implementação

---

## Understanding Summary

- **O que**: Busca semântica in-process (TypeScript cosine similarity) + tool `memory_add` com extração LLM e deduplicação por merge
- **Por quê**: BM25 keyword falha para queries semânticas ("machine learning" ≠ "inteligência artificial"). `memory_store` manual tem fricção — usuário precisa estruturar e chamar explicitamente
- **Para quem**: Bots WhatsApp/n8n com dezenas de usuários simultâneos (userId isolation já implementado no Sprint 0)
- **Restrições**: TypeScript ESM, Node 18+, zero infraestrutura extra, embeddings OpenAI já funcionam (1536 dims, cache por hash)
- **Non-goals**: sqlite-vec nativo, suporte a outros modelos de embedding, deduplicação perfeita

---

## Assumptions

| # | Assumption |
|---|-----------|
| 1 | LLM de extração = OpenAI (mesma API key dos embeddings) |
| 2 | Default model = `gpt-4o-mini` (configurável via `extractionModel` no server config) |
| 3 | Threshold de similaridade para deduplicação = 0.85 cosine |
| 4 | Escala atual: ~100-2000 chunks por usuário (in-process é suficiente) |
| 5 | `memory_add` salva sempre em `memory/` (indexável por `listMemoryFiles()`) |
| 6 | Prompts de extração em inglês (maior confiabilidade LLM) |
| 7 | sqlite-vec pode ser adicionado depois como upgrade — a interface `searchVector` já existe |

---

## Decision Log

| # | Decisão | Alternativas consideradas | Motivo |
|---|---------|--------------------------|--------|
| D1 | Cosine similarity em TypeScript, não sqlite-vec | sqlite-vec nativo | Elimina risco de plataforma; embeddings já estão no SQLite como JSON; escala suficiente para uso atual |
| D2 | memory_add com deduplicação por merge (LLM) | Update (substitui), Append, Skip | Merge preserva todos os fatos únicos E atualiza informações desatualizadas — cobre ambos os casos |
| D3 | Threshold 0.85 para "é duplicata?" | 0.7, 0.9 | 0.85 é conservador o suficiente para não confundir tópicos diferentes, agressivo o suficiente para detectar variações do mesmo fato |
| D4 | memory_add implementado no MCP server (não no core) | Implementar no core | Depende de chamada LLM que é responsabilidade do servidor, não da biblioteca |
| D5 | gpt-4o-mini como default de extração | gpt-4o, claude-3-haiku | Melhor custo-benefício; qualidade suficiente para extração de fatos estruturados |

---

## Final Design

### Seção 1 — Vector Search In-Process

**Arquivo**: `packages/core/src/memory/storage.ts`

Novo método `searchVectorInProcess()`:

```typescript
searchVectorInProcess(params: SearchVectorParams): VectorSearchResult[] {
  // 1. Load all chunks com embeddings
  let sql = "SELECT id, path, source, start_line, end_line, text, embedding FROM chunks";
  if (params.source) sql += " WHERE source = ?";

  // 2. Compute cosine similarity in TypeScript
  const results = rows
    .map(row => ({
      ...row,
      distance: 1 - cosineSimilarity(params.embedding, JSON.parse(row.embedding))
    }))
    .filter(r => r.distance <= (1 - 0.3)) // mínimo score 0.3
    .sort((a, b) => a.distance - b.distance)
    .slice(0, params.limit);

  return results;
}

// Função matemática central
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
```

**Arquivo**: `packages/core/src/memory/manager.ts`

`searchMemory()` passa a usar `searchVectorInProcess()` quando `vecAvailable = false` (que é sempre, por ora). Hybrid merge já existe em `hybrid.ts` — passa a ter dados reais de vector.

---

### Seção 2 — memory_add Pipeline

**Arquivo**: `packages/mcp-server/src/index.ts`

Nova tool `memory_add`:

```
INPUT: { message: string, userId?: string }

PASSO 1 — Embed a mensagem
  embedding = await embeddingProvider.embed(message)

PASSO 2 — Buscar memórias similares
  results = storage.searchVectorInProcess({
    embedding, limit: 3, threshold: (1 - 0.85) // distância ≤ 0.15
  })

PASSO 3 — LLM decide
  SE results.length > 0 (similar encontrado):
    prompt = MERGE_PROMPT(existing_content, new_message)
    → salva em results[0].path (atualiza arquivo existente)
    → action: "merged"
  SENÃO:
    prompt = EXTRACT_PROMPT(new_message)
    → salva em "memory/facts-{TIMESTAMP}.md"
    → action: "created"

PASSO 4 — Retornar
  { action: "merged" | "created", path, summary }
```

**Prompts LLM:**

```
EXTRACT_PROMPT:
"Extract structured facts from the following message as clean Markdown.
Use headers for categories (Profile, Preferences, Projects, etc).
Be concise. Only include factual information.
Message: {message}"

MERGE_PROMPT:
"You have existing memory and new information.
Produce a merged version that: preserves all unique facts,
updates outdated information with the new version.
Existing: {existing}
New information: {new_message}"
```

---

### Seção 3 — Testes

**Testes automáticos (Vitest)**:

| Arquivo | Testes |
|---------|--------|
| `packages/core/src/memory/storage.test.ts` | cosineSimilarity matemático (idênticos=1, ortogonais=0, opostos=-1), searchVectorInProcess retorna resultados ordenados |
| `packages/mcp-server/src/index.test.ts` | memory_add cria arquivo, memory_add faz merge quando similar encontrado, memory_add tópicos diferentes = arquivos separados |

**Cenários n8n UI**:

```
# Cenário 1: Extração nova
memory_add: { message: "Meu nome é Tiago, sou dev TypeScript", userId: "tiago_123" }
→ Esperado: action: "created", path: "memory/facts-*.md"

# Cenário 2: Merge (mesma pessoa, nova info)
memory_add: { message: "Tiago agora trabalha com IA também", userId: "tiago_123" }
→ Esperado: action: "merged", mesmo path do Cenário 1

# Cenário 3: Novo tópico (não deve fazer merge)
memory_add: { message: "Gosto de café pela manhã", userId: "tiago_123" }
→ Esperado: action: "created", novo path

# Cenário 4: Busca semântica (sem keyword match)
memory_search: { query: "machine learning expert", userId: "tiago_123" }
→ Esperado: resultCount >= 1, score > 0.5 (encontra "dev TypeScript + IA")

# Cenário 5: Isolamento
memory_search: { query: "Tiago", userId: "hacker_456" }
→ Esperado: resultCount: 0
```

---

## Deliverables Sprint 1

- [ ] `cosineSimilarity()` + `searchVectorInProcess()` em `storage.ts`
- [ ] Hybrid search usando vector results reais em `manager.ts`
- [ ] Tool `memory_add` em `mcp-server/src/index.ts`
- [ ] `extractionModel` configurável no server config (default: `gpt-4o-mini`)
- [ ] Testes matemáticos de cosine similarity (Vitest)
- [ ] Testes de integração: memory_add cria + merge
- [ ] Cenários n8n documentados e validados
- [ ] minScore default ajustado para hybrid (vector + keyword)
