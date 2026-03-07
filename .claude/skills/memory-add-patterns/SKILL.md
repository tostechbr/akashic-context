---
name: memory-add-patterns
description: Patterns for implementing memory_add tool in Akashic Context — LLM extraction pipeline, deduplication by merge, file naming, prompts. Preload into agents implementing Sprint 1.
user-invocable: false
---

# memory_add Patterns — Akashic Context Sprint 1

## What memory_add does

Takes a raw message → extracts structured facts → stores in user's memory.
Two paths depending on deduplication check:

```
memory_add({ message, userId })
  │
  ├─ embed(message)
  ├─ searchVectorInProcess(embedding, limit=3, threshold=0.15 distance)
  │
  ├─ IF similar found (distance ≤ 0.15 = similarity ≥ 0.85):
  │     LLM merge(existing_content + new_message)
  │     → memory_store(existing_path, merged)
  │     → return { action: "merged", path }
  │
  └─ IF no similar found:
        LLM extract(message)
        → memory_store("memory/facts-{TIMESTAMP}.md", extracted)
        → return { action: "created", path }
```

## Decision Log Reference

- **D2**: Merge (not update/append/skip) — preserves all unique facts AND updates outdated info
- **D3**: Threshold 0.85 cosine (0.15 distance) — conservative enough to not confuse topics
- **D4**: Implemented in mcp-server (not core) — LLM calls are server responsibility
- **D5**: gpt-4o-mini default — cost-effective for fact extraction

## Zod Schema

```typescript
const schema = z.object({
  message: z.string().min(1),
  userId: z.string().optional().default("default"),
});
```

## LLM Prompts

### EXTRACT_PROMPT (new memory)

```typescript
const EXTRACT_PROMPT = (message: string) => `
Extract structured facts from the following message as clean Markdown.
Use headers for categories (e.g. ## Profile, ## Preferences, ## Projects).
Be concise. Only include factual information. Ignore questions or commands.

Message: ${message}
`.trim();
```

### MERGE_PROMPT (deduplication found)

```typescript
const MERGE_PROMPT = (existing: string, newMessage: string) => `
You have existing memory and new information about the same topic.
Produce a merged Markdown document that:
- Preserves all unique facts from existing memory
- Updates any outdated information with the new version
- Adds any new facts not present in existing memory
- Keeps the same Markdown structure

Existing memory:
${existing}

New information:
${newMessage}
`.trim();
```

## File Naming Convention

New memories: `memory/facts-{TIMESTAMP}.md`

```typescript
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const path = `memory/facts-${timestamp}.md`;
```

## Handler Pattern

```typescript
private async handleMemoryAdd(args: unknown) {
  const schema = z.object({
    message: z.string().min(1),
    userId: z.string().optional().default("default"),
  });

  const { message, userId } = schema.parse(args);
  const manager = await this.getOrCreateManager(userId);
  const userWorkspaceDir = this.getUserWorkspaceDir(userId);

  try {
    // Step 1: Embed the message
    const embedding = await this.embedMessage(message);

    // Step 2: Search for similar existing memories
    const similar = manager.searchVectorInProcess({
      embedding,
      limit: 3,
    }).filter(r => r.distance <= 0.15); // similarity >= 0.85

    let action: "created" | "merged";
    let savedPath: string;

    if (similar.length > 0) {
      // Step 3a: Merge with most similar existing memory
      const existingPath = similar[0].path;
      const existingContent = await fs.readFile(
        path.join(userWorkspaceDir, existingPath), "utf-8"
      );
      const merged = await this.callLLM(MERGE_PROMPT(existingContent, message));
      await this.handleMemoryStore({ path: existingPath, content: merged, userId });
      action = "merged";
      savedPath = existingPath;
    } else {
      // Step 3b: Extract and create new memory
      const extracted = await this.callLLM(EXTRACT_PROMPT(message));
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      savedPath = `memory/facts-${timestamp}.md`;
      await this.handleMemoryStore({ path: savedPath, content: extracted, userId });
      action = "created";
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({ success: true, action, path: savedPath }, null, 2),
      }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${String(err)}` }],
      isError: true,
    };
  }
}
```

## callLLM Helper

```typescript
private async callLLM(prompt: string): Promise<string> {
  const response = await this.openai.chat.completions.create({
    model: this.extractionModel ?? "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
  });
  return response.choices[0]?.message?.content ?? "";
}
```

Note: `this.openai` reuses the same OpenAI client instance used for embeddings.
`this.extractionModel` comes from server config (optional, default: "gpt-4o-mini").

## Tool Registration (inputSchema)

```json
{
  "name": "memory_add",
  "description": "Automatically extract facts from a message and store in memory. Deduplicates by merging with similar existing memories.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "message": {
        "type": "string",
        "description": "The message or text to extract facts from"
      },
      "userId": {
        "type": "string",
        "description": "User identifier for memory isolation (default: 'default')"
      }
    },
    "required": ["message"]
  }
}
```

## n8n Test Scenarios

```
Scenario 1 — New extraction:
  memory_add({ message: "My name is Tiago, I'm a TypeScript developer", userId: "tiago_123" })
  → Expected: { action: "created", path: "memory/facts-*.md" }

Scenario 2 — Merge (same topic, new info):
  memory_add({ message: "Tiago now also works with AI", userId: "tiago_123" })
  → Expected: { action: "merged", same path as Scenario 1 }

Scenario 3 — Different topic (should NOT merge):
  memory_add({ message: "I like coffee in the morning", userId: "tiago_123" })
  → Expected: { action: "created", new path }

Scenario 4 — Semantic search validation:
  memory_search({ query: "machine learning expert", userId: "tiago_123" })
  → Expected: resultCount >= 1, score > 0.5 (finds "TypeScript dev + AI")

Scenario 5 — Isolation check:
  memory_search({ query: "Tiago", userId: "hacker_456" })
  → Expected: resultCount: 0
```

## Files to Modify

- `packages/mcp-server/src/index.ts`:
  - Add `memory_add` to tool list + handler
  - Add `callLLM()` private method
  - Add `extractionModel?: string` to server config
  - Add OpenAI chat client (may already exist via embedding provider)
