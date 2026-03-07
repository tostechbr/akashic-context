---
name: sprint-1
description: Run Sprint 1 - Vector Search + memory_add implementation for Akashic Context
---

Run the `sprint-1` agent to implement Sprint 1 of Akashic Context.

The agent will:
1. Add `cosineSimilarity()` + `searchVectorInProcess()` to storage.ts
2. Wire hybrid merge to use real vector results in manager.ts
3. Implement `memory_add` MCP tool with LLM extraction and deduplication
4. Write all tests (TDD: RED → GREEN → REFACTOR)
5. Run `pnpm test -- --run` to validate everything passes

Design is pre-validated. See `docs/sprint-1-design.md` for full spec.
