import pg from "pg";
import { config } from "../config.js";

const { Pool } = pg;

let pool;

export function getDatabasePool() {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
    });
  }

  return pool;
}

export async function initializeDatabase({ retries = 20, delayMs = 1000 } = {}) {
  const db = getDatabasePool();

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await db.query("SELECT 1");
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      console.log("[database] connected and migrations applied");
      return;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      console.log(
        `[database] waiting for Postgres (${attempt}/${retries}): ${error.message}`
      );
      await new Promise(resolve => {
        setTimeout(resolve, delayMs);
      });
    }
  }
}
