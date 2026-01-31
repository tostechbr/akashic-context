
import fs from 'node:fs/promises';
import path from 'node:path';
import { MemoryManager } from '../packages/core/src/memory/manager.js'; // Importing directly from source for dev

// 1. Setup paths
const WORKSPACE_DIR = path.resolve('./test-workspace');
const DATA_DIR = path.join(WORKSPACE_DIR, '.data');

async function main() {
  console.log("🚀 Starting Local Memory Test...");

  // Clean implementation: recreate workspace
  await fs.rm(WORKSPACE_DIR, { recursive: true, force: true });
  await fs.mkdir(WORKSPACE_DIR, { recursive: true });
  await fs.mkdir(path.join(WORKSPACE_DIR, 'memory'), { recursive: true });

  // 2. Create a dummy memory file
  const memoryContent = `
# Project Alpha

Project Alpha is a secret initiative to build a Dyson Sphere.
The project operates under the codename "Sunshade".

## Budget
The allocated budget is $500 trillion USD.
  `;
  
  await fs.writeFile(path.join(WORKSPACE_DIR, 'memory', 'project-alpha.md'), memoryContent);
  console.log("📝 Created dummy memory file: memory/project-alpha.md");

  // 3. Initialize Memory Manager
  console.log("⚙️ Initializing Memory Manager...");
  const manager = new MemoryManager({
    userId: 'user-test',
    workspaceDir: WORKSPACE_DIR,
    dataDir: DATA_DIR,
    memory: {
      enabled: true,
      provider: 'local', // Using mock below
      model: 'mock-model',
      chunkSize: 200,
      chunkOverlap: 20,
    }
  });

  // 4. Set a Mock Embedding Provider
  // This avoids needing an OpenAI key for this simple test
  manager.setEmbeddingProvider({
    model: 'mock-model',
    embed: async (texts) => {
      // Return random normalized vectors for technical validaty
      // In a real scenario, you'd use OpenAI or another provider
      return texts.map(() => {
        const vec = Array(1536).fill(0).map(() => Math.random());
        const norm = Math.sqrt(vec.reduce((sum, v) => sum + v*v, 0));
        return vec.map(v => v/norm);
      });
    }
  });

  // 5. Sync (Read files -> Chunk -> Embed -> Store)
  console.log("🔄 Syncing memory (indexing files)...");
  await manager.sync();
  
  const stats = manager.getChunkCount();
  console.log(`✅ Indexed ${stats} chunks.`);

  // 6. Search
  console.log("\n🔍 Test 1: Searching for 'budget'...");
  const results1 = await manager.search('budget');
  
  results1.forEach((r, i) => {
    console.log(`   [${i+1}] Score: ${r.score.toFixed(2)} | Text: "${r.snippet.replace(/\n/g, ' ').substring(0, 60)}..."`);
  });

  if (results1.length > 0) {
    console.log("   ✅ Found relevant memory!");
  } else {
    console.log("   ❌ No results found (unexpected for FTS).");
  }

  // 7. Cleanup
  await manager.close();
  console.log("\n👋 Done!");
}

main().catch(console.error);
