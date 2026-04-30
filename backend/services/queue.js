import IORedis from "ioredis";
import { Queue, Worker } from "bullmq";
import { config } from "../config.js";

let connection;
let queue;
let workerStarted = false;

function getConnection() {
  if (!config.redisUrl) {
    throw new Error("REDIS_URL is not configured");
  }

  if (!connection) {
    console.log(`[queue] connecting to Redis at ${config.redisUrl}`);
    connection = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
    });

    connection.on("connect", () => {
      console.log("[queue] Redis connection established");
    });

    connection.on("error", error => {
      console.error("[queue] Redis connection error:", error.message);
    });
  }

  return connection;
}

export function canUseQueue() {
  return Boolean(config.redisUrl);
}

export function getIngestionQueue() {
  if (!queue) {
    console.log(`[queue] creating BullMQ queue "${config.queueName}"`);
    queue = new Queue(config.queueName, {
      connection: getConnection(),
    });
  }

  return queue;
}

export function startIngestionWorker(processor) {
  if (!canUseQueue() || workerStarted) {
    if (!canUseQueue()) {
      console.log("[queue] Redis queue disabled, uploads will be indexed inline");
    }
    return null;
  }

  workerStarted = true;
  console.log(`[queue] starting BullMQ worker for queue "${config.queueName}"`);

  const worker = new Worker(
    config.queueName,
    async job => {
      console.log(`[queue] worker picked job ${job.id} (${job.name})`);
      return processor(job.data);
    },
    {
      connection: getConnection(),
    }
  );

  worker.on("completed", job => {
    console.log(`[queue] worker completed job ${job.id} (${job.name})`);
  });

  worker.on("failed", (job, error) => {
    console.error(
      `[queue] worker failed job ${job?.id || "unknown"} (${job?.name || "unknown"}): ${error.message}`
    );
  });

  return worker;
}
