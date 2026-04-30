import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

const documents = new Map();
const storePath = config.documentStorePath;

function loadDocuments() {
  try {
    if (!fs.existsSync(storePath)) {
      return;
    }

    const raw = fs.readFileSync(storePath, "utf8");
    if (!raw.trim()) {
      return;
    }

    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed) ? parsed : parsed.documents || [];

    records.forEach(record => {
      if (record?.id) {
        documents.set(record.id, record);
      }
    });

    console.log(`[document-store] loaded ${documents.size} documents from ${storePath}`);
  } catch (error) {
    console.error(`[document-store] could not load ${storePath}: ${error.message}`);
  }
}

function persistDocuments() {
  const directory = path.dirname(storePath);
  fs.mkdirSync(directory, { recursive: true });

  const payload = {
    version: 1,
    savedAt: new Date().toISOString(),
    documents: [...documents.values()],
  };

  const tempPath = `${storePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2));
  fs.renameSync(tempPath, storePath);
}

loadDocuments();

export function saveDocumentRecord(record) {
  documents.set(record.id, record);
  persistDocuments();
  return record;
}

export function getDocumentRecord(id) {
  return documents.get(id) || null;
}

export function listDocumentRecordsByUser(userEmail) {
  return [...documents.values()].filter(record => record.userEmail === userEmail);
}

export function listReadyChunksByUser(userEmail) {
  return [...documents.values()]
    .filter(record => record.userEmail === userEmail && record.status === "indexed")
    .flatMap(record => record.chunks);
}

export function updateDocumentRecord(id, updates) {
  const existing = getDocumentRecord(id);
  if (!existing) {
    return null;
  }

  const next = { ...existing, ...updates };
  documents.set(id, next);
  persistDocuments();
  return next;
}

export function getDocumentStoreStats() {
  const records = [...documents.values()];
  const statusCounts = records.reduce((accumulator, record) => {
    const key = record.status || "unknown";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  return {
    totalDocuments: records.length,
    readyDocuments: records.filter(record => record.status === "indexed").length,
    totalChunks: records.reduce((sum, record) => sum + record.chunks.length, 0),
    statusCounts,
  };
}
