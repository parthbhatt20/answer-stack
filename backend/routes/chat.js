
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { generateAnswer } from "../services/rag.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", async (req, res) => {
  const { message, context = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const result = await generateAnswer({
      message,
      context,
      user: req.user,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
