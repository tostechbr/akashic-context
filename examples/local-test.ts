import fs from 'node:fs/promises';
import path from 'node:path';
import { MemoryManager } from '../packages/core/src/memory/manager.js'; // Importing directly from source for dev

import { createOpenAIEmbeddingProvider } from '../packages/core/src/memory/providers/openai.js';

// 1. Setup paths
const WORKSPACE_DIR = path.resolve('./test-workspace');
const DATA_DIR = path.join(WORKSPACE_DIR, '.data');

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  const useOpenAI = !!apiKey;

  console.log("🚀 Starting Local Memory Test...");
  console.log(`ℹ️  Mode: ${useOpenAI ? 'OPENAI (Real Embeddings)' : 'MOCK (Random Vectors)'}`);

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
      provider: useOpenAI ? 'openai' : 'local',
      model: useOpenAI ? 'text-embedding-3-small' : 'mock-model',
      chunkSize: 200,
      chunkOverlap: 20,
      // Adjust weights based on provider
      // Real vectors are good, so we can trust them more (0.7).
      // Random vectors are garbage, so we trust them less (0.1).
      vectorWeight: useOpenAI ? 0.7 : 0.1,
      textWeight: useOpenAI ? 0.3 : 0.9,
      minScore: useOpenAI ? 0.35 : 0.1
    }
  });

  // 4. Set Provider
  if (useOpenAI) {
    console.log("🔌 Connecting to OpenAI...");
    manager.setEmbeddingProvider(createOpenAIEmbeddingProvider({
      apiKey: apiKey!
    }));
  } else {
    console.log("🔌 Setting up Mock Provider...");
    manager.setEmbeddingProvider({
      model: 'mock-model',
      embed: async (texts) => {
        // Return random normalized vectors for technical validity
        return texts.map(() => {
          const vec = Array(1536).fill(0).map(() => Math.random());
          const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
          return vec.map(v => v / norm);
        });
      }
    });
  }

  // 5. Sync (Read files -> Chunk -> Embed -> Store)
  console.log("🔄 Syncing memory (indexing files)...");
  await manager.sync();

  const stats = manager.getChunkCount();
  console.log(`✅ Indexed ${stats} chunks.`);

  // 6. Search
  console.log("\n🔍 Test 1: Searching for 'budget'...");
  const results1 = await manager.search('budget', { minScore: 0.1 });

  results1.forEach((r, i) => {
    console.log(`   [${i + 1}] Score: ${r.score.toFixed(2)} | Text: "${r.snippet.replace(/\n/g, ' ').substring(0, 60)}..."`);
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
