import mammoth from "mammoth";
import pdfParse from "pdf-parse";

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".json", ".csv"]);

function getExtension(filename) {
  const normalized = String(filename || "").toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  return dotIndex === -1 ? "" : normalized.slice(dotIndex);
}

export function isSupportedUpload(filename) {
  return [".txt", ".md", ".json", ".csv", ".pdf", ".docx"].includes(
    getExtension(filename)
  );
}

export async function extractTextFromUpload(file) {
  if (!file) {
    throw new Error("No file uploaded");
  }

  const extension = getExtension(file.originalname);

  if (TEXT_EXTENSIONS.has(extension)) {
    return file.buffer.toString("utf8");
  }

  if (extension === ".pdf") {
    const parsed = await pdfParse(file.buffer);
    return parsed.text;
  }

  if (extension === ".docx") {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return parsed.value;
  }

  throw new Error("Unsupported file type. Use TXT, MD, JSON, CSV, PDF, or DOCX.");
}
