import { config } from "../config.js";
import { listReadyChunksByUser } from "./document-store.js";
import { getOpenAIClient, getPineconeIndex, canUseManagedRag } from "./providers.js";
import { scoreChunkAgainstQuery } from "./text.js";

export async function embedText(input) {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: config.embeddingModel,
    input,
    encoding_format: "float",
  });

  return response.data[0].embedding;
}

export async function indexChunks({ documentId, filename, userEmail, chunks }) {
  if (chunks.length === 0) {
    return { count: 0, mode: "empty" };
  }

  if (!canUseManagedRag()) {
    return { count: chunks.length, mode: "demo" };
  }

  const embeddings = await Promise.all(chunks.map(chunk => embedText(chunk.text)));
  const index = getPineconeIndex();

  await index.namespace(config.pineconeNamespace).upsert(
    embeddings.map((values, indexPosition) => ({
      id: chunks[indexPosition].id,
      values,
      metadata: {
        documentId,
        filename,
        userEmail,
        text: chunks[indexPosition].text,
        chunkIndex: chunks[indexPosition].chunkIndex,
      },
    }))
  );

  return { count: chunks.length, mode: "pinecone" };
}

export async function searchRelevantChunks({ message, userEmail, limit = 5 }) {
  if (!canUseManagedRag()) {
    const matches = listReadyChunksByUser(userEmail)
      .map(chunk => ({
        ...chunk,
        score: scoreChunkAgainstQuery(chunk.text, message),
      }))
      .filter(chunk => chunk.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);

    return matches.map(({ text, filename, chunkIndex, score }) => ({
      text,
      filename,
      chunkIndex,
      score,
    }));
  }

  const vector = await embedText(message);
  const index = getPineconeIndex();
  const response = await index.namespace(config.pineconeNamespace).query({
    vector,
    topK: limit,
    includeMetadata: true,
    filter: {
      userEmail: { $eq: userEmail },
    },
  });

  return (response.matches || []).map(match => ({
    text: match.metadata?.text || "",
    filename: match.metadata?.filename || "unknown",
    chunkIndex: match.metadata?.chunkIndex ?? 0,
    score: match.score ?? 0,
  }));
}
