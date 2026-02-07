# Architecture & Standards

This document defines the architectural standards for the Akashic Context project.

## Project Structure

```
akashic-context/
├── packages/
│   ├── core/                    # Core library (memory, search, storage)
│   │   ├── src/
│   │   │   ├── memory/          # Memory system
│   │   │   │   ├── *.ts         # Implementation files
│   │   │   │   ├── *.test.ts    # Colocated unit tests (Vitest)
│   │   │   │   └── providers/   # Embedding providers
│   │   │   ├── utils/           # Utility functions
│   │   │   ├── types.ts         # Type definitions
│   │   │   └── index.ts         # Public API exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mcp-server/              # MCP Server adapter
│       ├── src/
│       │   ├── index.ts         # Server implementation
│       │   ├── index.test.ts    # Unit tests (TODO)
│       │   └── cli.ts           # CLI entry point
│       ├── tests/               # Integration tests (E2E)
│       │   ├── integration/
│       │   │   ├── memory-store.test.ts
│       │   │   ├── memory-delete.test.ts
│       │   │   └── simple.test.ts
│       │   └── fixtures/        # Test fixtures
│       ├── package.json
│       └── tsconfig.json
│
├── examples/                    # Example workflows
│   ├── n8n-*.json              # n8n workflow examples
│   └── README.md               # Examples documentation
│
├── docs/                        # Documentation
│   ├── TESTING.md              # Testing guide
│   ├── ARCHITECTURE.md         # This file
│   └── *.md                    # Other docs
│
└── test-workspace-mcp/         # Test workspace for MCP server
    ├── MEMORY.md
    └── memory/*.md
```

---

## Standards

### 1. File Organization

#### Colocated Tests Pattern ✅

**Pattern**: Place test files next to implementation files

```
src/
├── feature.ts        # Implementation
└── feature.test.ts   # Unit tests
```

**Example from core**:
```
packages/core/src/memory/
├── chunking.ts
├── chunking.test.ts    ✅ CORRECT
├── manager.ts
└── manager.test.ts     ✅ CORRECT
```

#### Integration Tests Pattern ✅

**Pattern**: Separate directory for integration/E2E tests

```
packages/mcp-server/
├── src/              # Implementation
└── tests/            # Integration tests
    ├── integration/
    └── fixtures/
```

---

### 2. Test Standards

#### Unit Tests (Vitest)

**Location**: `*.test.ts` next to implementation
**Framework**: Vitest
**Purpose**: Test individual functions/classes in isolation

**Template**:
```typescript
import { describe, expect, test, beforeEach, afterEach } from "vitest";

describe("Feature", () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe("method", () => {
    test("should do something", () => {
      expect(result).toBe(expected);
    });
  });
});
```

#### Integration Tests (Vitest)

**Location**: `tests/integration/*.test.ts`
**Framework**: Vitest
**Purpose**: Test complete workflows end-to-end

**Template**:
```typescript
import { describe, expect, test } from "vitest";

describe("Feature Integration", () => {
  test("should work end-to-end", async () => {
    // Full workflow test
  });
});
```

---

### 3. TypeScript Standards

#### File Extensions
- Implementation: `.ts`
- Tests: `.test.ts`
- Type definitions: `.d.ts`
- Config: `.json`

#### Import Style
```typescript
// ✅ CORRECT: Use .js extension for ESM
import { foo } from "./bar.js";

// ❌ WRONG: No extension
import { foo } from "./bar";
```

#### Type Safety
```typescript
// ✅ CORRECT: Explicit types
function process(data: string): Result {
  // ...
}

// ❌ WRONG: any
function process(data: any): any {
  // ...
}
```

---

### 4. Package Structure

#### Core Package (`packages/core`)

**Purpose**: Reusable memory/search library

**Exports**:
```typescript
// src/index.ts
export { MemoryManager } from "./memory/manager.js";
export { createOpenAIEmbeddingProvider } from "./memory/providers/openai.js";
export type { EmbeddingProvider } from "./types.js";
```

**Dependencies**: Minimal (better-sqlite3, openai)

#### MCP Server Package (`packages/mcp-server`)

**Purpose**: MCP protocol adapter for n8n/Claude

**Exports**:
```typescript
// src/index.ts
export { MemoryMcpServer } from "./index.js";
```

**Dependencies**: `@akashic-context/core` + MCP SDK

---

## Current Issues & Fixes Needed

### ❌ Issues Found

1. **Missing unit tests for MCP server**
   ```
   packages/mcp-server/src/
   ├── index.ts              ✅ Implementation
   └── index.test.ts         ❌ MISSING
   ```

2. **Integration tests in wrong location**
   ```
   packages/mcp-server/
   ├── test-simple.js        ❌ Wrong location
   ├── test-memory-store.js  ❌ Wrong location
   └── test-memory-delete.js ❌ Wrong location
   ```

3. **Inconsistent file extensions**
   - Integration tests should be `.test.ts` (Vitest)
   - Currently are `.js` files

---

## ✅ Proposed Fixes

### Fix 1: Create Unit Tests

**Create**: `packages/mcp-server/src/index.test.ts`

```typescript
import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { MemoryMcpServer } from "./index.js";

describe("MemoryMcpServer", () => {
  describe("handleMemoryStore", () => {
    test("should create new file", async () => {
      // Test implementation
    });

    test("should update existing file", async () => {
      // Test implementation
    });

    test("should reject invalid paths", async () => {
      // Security test
    });
  });

  describe("handleMemoryDelete", () => {
    test("should delete file", async () => {
      // Test implementation
    });

    test("should protect MEMORY.md", async () => {
      // Security test
    });
  });
});
```

---

### Fix 2: Reorganize Integration Tests

**Move**:
```bash
# From (current)
packages/mcp-server/test-*.js

# To (correct)
packages/mcp-server/tests/integration/*.test.ts
```

**New structure**:
```
packages/mcp-server/tests/
├── integration/
│   ├── memory-store.test.ts    # Converted from test-memory-store.js
│   ├── memory-delete.test.ts   # Converted from test-memory-delete.js
│   └── simple.test.ts          # Converted from test-simple.js
└── fixtures/
    └── test-workspace/
        ├── MEMORY.md
        └── memory/
```

---

### Fix 3: Update Test Commands

**package.json** (mcp-server):
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run src",
    "test:integration": "vitest run tests/integration",
    "test:watch": "vitest"
  }
}
```

---

## Testing Strategy

### Unit Tests (Fast)
- Test individual methods
- Mock external dependencies
- Run on every commit
- Coverage target: 80%+

### Integration Tests (Slower)
- Test complete workflows
- Real MCP protocol (stdio)
- Real file system operations
- Run before releases

### E2E Tests (Slowest)
- Test with real n8n workflows
- Real OpenAI API calls
- Manual testing for now
- Automated in CI later

---

## Quality Standards

### Code Review Checklist

- [ ] Unit tests colocated with implementation
- [ ] Integration tests in `tests/integration/`
- [ ] All tests use Vitest (not raw .js)
- [ ] TypeScript strict mode enabled
- [ ] No `any` types (use `unknown` if needed)
- [ ] Imports use `.js` extension
- [ ] Security checks for file operations
- [ ] Error handling implemented
- [ ] Documentation updated

### Test Coverage Goals

| Package | Unit Tests | Integration Tests |
|---------|-----------|------------------|
| core | 80%+ | N/A |
| mcp-server | 70%+ | 3+ workflows |

---

## Next Steps

1. **Create `packages/mcp-server/src/index.test.ts`** (unit tests)
2. **Move integration tests** to `tests/integration/`
3. **Convert `.js` to `.test.ts`** (use Vitest)
4. **Update test commands** in package.json
5. **Run full test suite**: `pnpm test`

---

## References

- **Vitest**: https://vitest.dev/
- **MCP Protocol**: https://modelcontextprotocol.io
- **TypeScript ESM**: https://www.typescriptlang.org/docs/handbook/esm-node.html
