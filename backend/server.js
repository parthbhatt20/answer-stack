
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import debugRoutes from "./routes/debug.js";
import uploadRoutes from "./routes/upload.js";
import whatsappRoutes from "./routes/whatsapp.js";
import { config } from "./config.js";
import { initializeDatabase } from "./services/database.js";
import { startIngestionWorker } from "./services/queue.js";
import { processIngestionJob } from "./services/rag.js";

const app = express();
const port = config.port;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);
app.use("/debug", debugRoutes);
app.use("/upload", uploadRoutes);
app.use("/whatsapp", whatsappRoutes);

async function startServer() {
  await initializeDatabase();
  startIngestionWorker(processIngestionJob);

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`[server] DEMO_MODE=${config.demoMode}`);
    console.log(
      `[server] Redis queue ${config.redisUrl ? `enabled (${config.redisUrl})` : "disabled"}`
    );
  });
}

startServer().catch(error => {
  console.error(`[server] failed to start: ${error.message}`);
  process.exit(1);
});
