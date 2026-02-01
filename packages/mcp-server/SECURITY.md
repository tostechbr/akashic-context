# Security

## Path Traversal Protection

The MCP Server implements robust path traversal protection in the `memory_get` tool to prevent unauthorized file access outside the workspace directory.

### Protection Mechanisms

1. **Path Normalization**: Removes `..` components from paths
2. **Absolute Path Resolution**: Converts relative paths to absolute paths
3. **Boundary Validation**: Ensures resolved path is within workspace
4. **File Size Limit**: Prevents reading files larger than 10MB (OOM protection)

### Attack Examples (Blocked)

```json
// ❌ BLOCKED: Path traversal attempt
{
  "path": "../../../etc/passwd"
}
// Response: "Error: Path outside workspace directory is not allowed"

// ❌ BLOCKED: Absolute path attempt
{
  "path": "/etc/passwd"
}
// Response: "Error: Path outside workspace directory is not allowed"

// ❌ BLOCKED: Windows-style traversal
{
  "path": "..\\..\\..\\windows\\system32\\config\\sam"
}
// Response: "Error: Path outside workspace directory is not allowed"

// ✅ ALLOWED: Valid workspace file
{
  "path": "memory/2025-01.md"
}
// Response: File content
```

### File Size Protection

```json
// ❌ BLOCKED: File too large (> 10MB)
{
  "path": "large-file.md"
}
// Response: "Error: File too large (15.23MB > 10MB limit)"
```

### Code Implementation

```typescript
// Normalize and validate path
const safePath = normalize(path).replace(/^(\.\.(\/|\\|$))+/, '');
const workspaceAbsPath = resolve(this.workspaceDir);
const requestedAbsPath = resolve(workspaceAbsPath, safePath);

// Security check: Ensure within workspace
if (!requestedAbsPath.startsWith(workspaceAbsPath + "/") &&
    requestedAbsPath !== workspaceAbsPath) {
  throw new Error("Path outside workspace");
}

// File size check
const stats = await fs.stat(requestedAbsPath);
if (stats.size > MAX_FILE_SIZE) {
  throw new Error("File too large");
}
```

## API Key Security

### Best Practices

1. **Environment Variables**: Store API keys in environment variables, never hardcode
   ```bash
   export OPENAI_API_KEY=sk-...
   ```

2. **Secret Managers**: For production, use dedicated secret managers
   - AWS Secrets Manager
   - HashiCorp Vault
   - 1Password CLI

3. **Key Rotation**: Regularly rotate API keys
4. **Least Privilege**: Use API keys with minimum required permissions

### Configuration Security

```json
// ✅ GOOD: Use environment variables
{
  "env": {
    "OPENAI_API_KEY": "${OPENAI_API_KEY}"
  }
}

// ❌ BAD: Hardcoded key
{
  "env": {
    "OPENAI_API_KEY": "sk-proj-abc123..."
  }
}
```

## Workspace Permissions

### Recommendations

1. **Restrict Write Access**: MCP Server only needs read access to workspace
   ```bash
   chmod 755 workspace/
   chmod 644 workspace/**/*.md
   ```

2. **Separate User**: Run MCP Server as dedicated user with limited permissions
   ```bash
   sudo -u mcp-server node dist/cli.js
   ```

3. **Sandboxing**: Consider running in Docker/container for additional isolation
   ```dockerfile
   FROM node:22-alpine
   RUN adduser -D mcp-user
   USER mcp-user
   WORKDIR /app
   CMD ["node", "dist/cli.js"]
   ```

## Reporting Security Issues

If you discover a security vulnerability, please email security@tostech.com.br with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

**Do not** create public GitHub issues for security vulnerabilities.
