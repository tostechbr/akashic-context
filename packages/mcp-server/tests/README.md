# MCP Server Tests

## Structure

```
tests/
├── integration/          # Legacy E2E tests (stdio-based)
│   ├── simple-legacy.js
│   ├── memory-store-legacy.js
│   └── memory-delete-legacy.js
└── fixtures/             # Test fixtures (workspace files, etc.)
```

## Test Types

### Unit Tests (Recommended)
**Location**: `src/*.test.ts`
**Framework**: Vitest
**Speed**: Fast (< 1s)
**Coverage**: All handlers (store, delete, get, search)

```bash
# Run unit tests
pnpm test:unit

# Watch mode
pnpm test:watch
```

**Why unit tests are better**:
- ✅ Much faster execution
- ✅ Better isolation and debugging
- ✅ Easier to maintain
- ✅ Standard Vitest framework
- ✅ Better assertions

### Legacy Integration Tests
**Location**: `tests/integration/*-legacy.js`
**Framework**: Raw Node.js (stdio)
**Speed**: Slow (8-12s per test)
**Purpose**: Historical E2E validation

**Status**: Legacy - kept for reference but not required

```bash
# Run legacy tests manually
node tests/integration/simple-legacy.js
node tests/integration/memory-store-legacy.js
node tests/integration/memory-delete-legacy.js
```

## Migration Complete ✅

All functionality from integration tests is now covered by unit tests:

| Integration Test | Unit Test Coverage |
|-----------------|-------------------|
| simple-legacy.js | `handleMemorySearch`, `handleMemoryGet` tests |
| memory-store-legacy.js | `handleMemoryStore` tests (8 tests) |
| memory-delete-legacy.js | `handleMemoryDelete` tests (5 tests) |

**Total**: 20 unit tests cover all MCP server functionality

---

## Running Tests

### Quick Test (Unit tests only)
```bash
pnpm test:unit
```

### Full Test Suite
```bash
pnpm test
```

### Watch Mode (Development)
```bash
pnpm test:watch
```

---

## Adding New Tests

### For new handlers
1. Add tests to `src/index.test.ts`
2. Follow existing patterns (beforeEach, afterEach, describe)
3. Test happy path + error cases + security

### For new integration scenarios
1. Consider if unit tests are sufficient
2. If E2E is truly needed, create new Vitest integration test
3. Do NOT create raw .js files

---

## Test Coverage

Current coverage (as of 2026-02-06):

| Handler | Unit Tests | Coverage |
|---------|-----------|----------|
| handleMemoryStore | 8 tests | 100% |
| handleMemoryDelete | 5 tests | 100% |
| handleMemoryGet | 3 tests | 100% |
| handleMemorySearch | 2 tests | 100% |
| **Total** | **20 tests** | **100%** |

---

## References

- **Unit tests**: `../src/index.test.ts`
- **Vitest docs**: https://vitest.dev/
- **Architecture**: `../../../docs/ARCHITECTURE.md`
