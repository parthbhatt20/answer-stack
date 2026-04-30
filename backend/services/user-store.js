import crypto from "node:crypto";
import { getDatabasePool } from "./database.js";

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const passwordHash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");

  return { passwordHash, passwordSalt: salt };
}

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    createdAt: row.created_at,
  };
}

export async function findUserByEmail(email) {
  const db = getDatabasePool();
  const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
  return mapUser(result.rows[0]);
}

export async function findUserByCredentials(email, password) {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  const { passwordHash } = hashPassword(password, user.passwordSalt);
  const storedHash = Buffer.from(user.passwordHash, "hex");
  const candidateHash = Buffer.from(passwordHash, "hex");

  if (storedHash.length !== candidateHash.length) {
    return null;
  }

  return crypto.timingSafeEqual(storedHash, candidateHash) ? user : null;
}

export async function createUser({ email, password }) {
  const db = getDatabasePool();
  const { passwordHash, passwordSalt } = hashPassword(password);
  const result = await db.query(
    `
      INSERT INTO users (id, email, password_hash, password_salt)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [crypto.randomUUID(), email, passwordHash, passwordSalt]
  );

  return mapUser(result.rows[0]);
}
