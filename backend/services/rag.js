import crypto from "node:crypto";
import { config, hasRealRagProviders } from "../config.js";
import {
  getDocumentRecord,
  listDocumentRecordsByUser,
  saveDocumentRecord,
  updateDocumentRecord,
} from "./document-store.js";
import { getOpenAIClient } from "./providers.js";
import { canUseQueue, getIngestionQueue } from "./queue.js";
import { chunkText, scoreChunkAgainstQuery, splitIntoSentences } from "./text.js";
import { indexChunks, searchRelevantChunks } from "./vector-store.js";

function buildChunkRecords(documentId, filename, content) {
  return chunkText(content).map((text, chunkIndex) => ({
    id: `${documentId}-chunk-${chunkIndex + 1}`,
    chunkIndex,
    filename,
    text,
  }));
}

export async function ingestDocument({ filename, content, userEmail }) {
  const documentId = crypto.randomUUID();
  const chunks = buildChunkRecords(documentId, filename, content);
  const useQueue = canUseQueue();

  console.log(
    `[rag] ingest requested for "${filename}" by ${userEmail} (${chunks.length} chunks, queue=${useQueue ? "enabled" : "disabled"})`
  );

  const record = saveDocumentRecord({
    id: documentId,
    filename,
    userEmail,
    originalLength: String(content).length,
    status: useQueue ? "queued" : "indexing",
    chunks,
    createdAt: new Date().toISOString(),
  });

  if (useQueue) {
    const queue = getIngestionQueue();
    const job = await queue.add("index-document", { documentId });
    console.log(`[rag] queued document ${documentId} as BullMQ job ${job.id}`);
    return record;
  }

  console.log(`[rag] queue disabled, indexing document ${documentId} inline`);
  await processIngestionJob({ documentId });
  return getDocumentRecord(documentId);
}

export async function processIngestionJob({ documentId }) {
  const record = getDocumentRecord(documentId);
  if (!record) {
    throw new Error("Document not found");
  }

  updateDocumentRecord(documentId, { status: "indexing" });
  console.log(`[rag] indexing started for document ${documentId} (${record.filename})`);

  try {
    const result = await indexChunks({
      documentId: record.id,
      filename: record.filename,
      userEmail: record.userEmail,
      chunks: record.chunks,
    });

    updateDocumentRecord(documentId, {
      status: "indexed",
      indexedAt: new Date().toISOString(),
      indexMode: result.mode,
    });

    console.log(
      `[rag] indexing completed for document ${documentId} using ${result.mode} mode`
    );

    return getDocumentRecord(documentId);
  } catch (error) {
    updateDocumentRecord(documentId, {
      status: "failed",
      error: error.message,
    });
    console.error(`[rag] indexing failed for document ${documentId}: ${error.message}`);
    throw error;
  }
}

function buildDemoAnswer({ message, snippets, userEmail }) {
  if (snippets.length === 0) {
    return [
      `Demo RAG answer for ${userEmail}.`,
      `I could not find a matching passage for "${message}" in the uploaded documents.`,
      "Try asking about a term that appears in the document text, or upload a larger sample.",
    ].join("\n\n");
  }

  const rankedSentences = snippets
    .flatMap(snippet =>
      splitIntoSentences(snippet.text).map(sentence => ({
        filename: snippet.filename,
        text: sentence,
        score: scoreChunkAgainstQuery(sentence, message),
      }))
    )
    .filter(sentence => sentence.score > 0)
    .sort((left, right) => right.score - left.score);

  const bestSentences = (rankedSentences.length ? rankedSentences : snippets)
    .slice(0, 2)
    .map(item => item.text);

  const sourceNames = [...new Set(snippets.map(snippet => snippet.filename))];

  return [
    `Answer: ${bestSentences.join(" ")}`,
    `Question: ${message}`,
    `Sources: ${sourceNames.join(", ")}`,
  ].join("\n\n");
}

export async function generateAnswer({ message, context = [], user }) {
  const userEmail = user?.email || "anonymous@example.com";
  console.log(`[rag] chat request from ${userEmail}: "${message}"`);
  const retrievedChunks = await searchRelevantChunks({
    message,
    userEmail,
  });
  console.log(`[rag] retrieved ${retrievedChunks.length} chunks for ${userEmail}`);

  const snippets = [...context, ...retrievedChunks].slice(0, 6);

  if (config.demoMode || !hasRealRagProviders()) {
    console.log("[rag] answering in demo mode");
    return {
      answer: buildDemoAnswer({ message, snippets, userEmail }),
      sources: snippets,
      mode: "demo",
    };
  }

  console.log("[rag] answering with managed providers");
  const openai = getOpenAIClient();
  const contextBlock = snippets.length
    ? snippets
        .map((snippet, index) => {
          return `Source ${index + 1} (${snippet.filename}): ${snippet.text}`;
        })
        .join("\n\n")
    : "No supporting context found.";

  const response = await openai.responses.create({
    model: config.openaiModel,
    instructions:
      "You are a RAG assistant. Answer with grounded information from the provided context. If the context is insufficient, say so clearly.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Question: ${message}\n\nRetrieved context:\n${contextBlock}`,
          },
        ],
      },
    ],
  });

  return {
    answer: response.output_text,
    sources: snippets,
    mode: "managed",
  };
}

export function listDocumentsForUser(userEmail) {
  return listDocumentRecordsByUser(userEmail);
}
