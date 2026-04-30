export const config = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  demoMode: (process.env.DEMO_MODE || "true").toLowerCase() === "true",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-5-mini",
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  pineconeApiKey: process.env.PINECONE_API_KEY || "",
  pineconeIndex: process.env.PINECONE_INDEX || "",
  pineconeNamespace: process.env.PINECONE_NAMESPACE || "rag-demo",
  redisUrl: process.env.REDIS_URL || "",
  queueName: process.env.INGEST_QUEUE_NAME || "document-ingestion",
  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB || 50),
};

export function hasRealRagProviders() {
  return Boolean(
    config.openaiApiKey &&
      config.pineconeApiKey &&
      config.pineconeIndex
  );
}
