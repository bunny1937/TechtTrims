// src/lib/middleware/csrf.js - CREATE NEW FILE
import { randomBytes } from "crypto";

const csrfTokens = new Map();

export const generateCSRFToken = () => {
  const token = randomBytes(32).toString("hex");
  const expiry = Date.now() + 60 * 60 * 1000; // 1 hour
  csrfTokens.set(token, expiry);

  // Cleanup expired tokens
  for (const [key, value] of csrfTokens.entries()) {
    if (value < Date.now()) {
      csrfTokens.delete(key);
    }
  }

  return token;
};

export const validateCSRFToken = (token) => {
  if (!token) return false;

  const expiry = csrfTokens.get(token);
  if (!expiry || expiry < Date.now()) {
    csrfTokens.delete(token);
    return false;
  }

  csrfTokens.delete(token); // Single use
  return true;
};

export const csrfMiddleware = (handler) => {
  return async (req, res) => {
    // GET requests don't need CSRF
    if (req.method === "GET") {
      return handler(req, res);
    }

    const token = req.headers["x-csrf-token"];
    if (!validateCSRFToken(token)) {
      return res.status(403).json({ message: "Invalid CSRF token" });
    }

    return handler(req, res);
  };
};
