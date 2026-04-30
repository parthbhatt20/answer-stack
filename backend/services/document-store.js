const documents = new Map();

export function saveDocumentRecord(record) {
  documents.set(record.id, record);
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
