import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { config, hasRealRagProviders } from "../config.js";

let openaiClient;
let pineconeIndex;

export function getOpenAIClient() {
  if (!config.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
  }

  return openaiClient;
}

export function getPineconeIndex() {
  if (!config.pineconeApiKey || !config.pineconeIndex) {
    throw new Error("Pinecone is not configured");
  }

  if (!pineconeIndex) {
    const pinecone = new Pinecone({ apiKey: config.pineconeApiKey });
    pineconeIndex = pinecone.index(config.pineconeIndex);
  }

  return pineconeIndex;
}

export function canUseManagedRag() {
  return !config.demoMode && hasRealRagProviders();
}
