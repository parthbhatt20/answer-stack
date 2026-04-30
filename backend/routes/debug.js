import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { config, hasRealRagProviders } from "../config.js";
import { getDocumentStoreStats } from "../services/document-store.js";
import { canUseQueue } from "../services/queue.js";
import { canUseManagedRag } from "../services/providers.js";

const router = express.Router();

router.use(requireAuth);

router.get("/storage", (_req, res) => {
  const documentStore = getDocumentStoreStats();

  res.json({
    demoMode: config.demoMode,
    queue: {
      enabled: canUseQueue(),
      provider: canUseQueue() ? "redis-bullmq" : "inline",
      redisUrlConfigured: Boolean(config.redisUrl),
      queueName: config.queueName,
    },
    documents: {
      provider: "in-memory-map",
      persistedAcrossBackendRestart: false,
      ...documentStore,
    },
    vectors: {
      managedModeEnabled: canUseManagedRag(),
      provider: canUseManagedRag() ? "pinecone" : "local-demo-search",
      pineconeConfigured: Boolean(config.pineconeApiKey && config.pineconeIndex),
      openaiConfigured: Boolean(config.openaiApiKey),
      allManagedProvidersConfigured: hasRealRagProviders(),
    },
  });
});

export default router;
