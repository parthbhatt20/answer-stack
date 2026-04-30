import express from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { config } from "../config.js";
import { extractTextFromUpload, isSupportedUpload } from "../services/file-parser.js";
import { ingestDocument, listDocumentsForUser } from "../services/rag.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadSizeMb * 1024 * 1024,
  },
});

router.use(requireAuth);

router.post("/", (req, res, next) => {
  upload.single("file")(req, res, error => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: `File is too large. Max upload size is ${config.maxUploadSizeMb} MB.`,
      });
    }

    return res.status(400).json({ error: error.message });
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "A file is required" });
  }

  if (!isSupportedUpload(req.file.originalname)) {
    return res.status(400).json({
      error: "Unsupported file type. Use TXT, MD, JSON, CSV, PDF, or DOCX.",
    });
  }

  try {
    console.log(
      `[upload] received "${req.file.originalname}" (${req.file.size} bytes) from ${req.user.email}`
    );
    const content = await extractTextFromUpload(req.file);
    console.log(
      `[upload] extracted ${content.length} characters from "${req.file.originalname}"`
    );

    if (!content.trim()) {
      return res.status(400).json({ error: "Could not extract readable text from the file" });
    }

    const document = await ingestDocument({
      filename: req.file.originalname,
      content,
      userEmail: req.user.email,
    });

    res.json({
      message: "Document accepted for indexing",
      document: {
        id: document.id,
        filename: document.filename,
        size: req.file.size,
        status: document.status,
        chunks: document.chunks.length,
      },
    });
  } catch (error) {
    console.error(`[upload] failed for "${req.file.originalname}": ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

router.get("/", (req, res) => {
  const documents = listDocumentsForUser(req.user.email).map(document => ({
    id: document.id,
    filename: document.filename,
    status: document.status,
    chunks: document.chunks.length,
    originalLength: document.originalLength,
    createdAt: document.createdAt,
    indexedAt: document.indexedAt || null,
    indexMode: document.indexMode || null,
  }));

  res.json({ documents });
});

export default router;
