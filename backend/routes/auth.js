
import express from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { createUser, findUserByCredentials, findUserByEmail } from "../services/user-store.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    await createUser({ email, password });
    res.json({ message: "User registered" });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "User already exists" });
    }

    res.status(500).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await findUserByCredentials(email, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { email },
      config.jwtSecret,
      { expiresIn: "1d" }
    );
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
