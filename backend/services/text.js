export function chunkText(content, size = 600, overlap = 120) {
  const text = String(content || "").trim();
  if (!text) {
    return [];
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end).trim());
    if (end === text.length) {
      break;
    }
    start = Math.max(end - overlap, start + 1);
  }

  return chunks.filter(Boolean);
}

export function scoreChunkAgainstQuery(chunk, query) {
  const queryTerms = String(query || "")
    .toLowerCase()
    .split(/\W+/)
    .filter(Boolean);

  if (queryTerms.length === 0) {
    return 0;
  }

  const source = chunk.toLowerCase();
  return queryTerms.reduce((score, term) => {
    return score + (source.includes(term) ? 1 : 0);
  }, 0);
}

export function splitIntoSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
}
