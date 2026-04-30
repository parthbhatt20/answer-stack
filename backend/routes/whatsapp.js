import express from "express";
import { generateAnswer } from "../services/rag.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const incomingMessage =
    req.body.Body || req.body.message || "Hello from WhatsApp";

  try {
    const result = await generateAnswer({
      message: incomingMessage,
      user: {
        email: req.body.From || "whatsapp-user@example.com",
      },
    });

    res.json({
      channel: "whatsapp",
      received: incomingMessage,
      reply: result.answer,
      sources: result.sources,
      mode: result.mode,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
