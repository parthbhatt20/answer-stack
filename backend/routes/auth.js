
import express from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

const router = express.Router();
let users = [];

router.post("/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const existingUser = users.find(user => user.email === email);
  if (existingUser) {
    return res.status(409).json({ error: "User already exists" });
  }

  users.push({ email, password });
  res.json({ message: "User registered" });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { email },
    config.jwtSecret,
    { expiresIn: "1d" }
  );
  res.json({ token });
});

export default router;
