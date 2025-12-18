// src/lib/middleware/csrf.js
import { randomBytes } from "crypto";
import clientPromise from "../mongodb";

// Generate token bound to identifier (email) - STORE IN DB
export const generateCSRFToken = async (identifier) => {
  const token = randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const client = await clientPromise;
  const db = client.db("techtrims");

  await db.collection("csrf_tokens").updateOne(
    { identifier },
    {
      $set: {
        token,
        expiresAt: expiry,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  console.log(
    `[CSRF] Generated for ${identifier}: ${token.substring(0, 8)}...`
  );
  return token;
};

// Validate token for identifier - CHECK DB
export const validateCSRFToken = async (identifier, token) => {
  if (!token || !identifier) {
    console.log(`[CSRF] Missing token or identifier`);
    return false;
  }

  const client = await clientPromise;
  const db = client.db("techtrims");

  const stored = await db.collection("csrf_tokens").findOne({ identifier });

  if (!stored) {
    console.log(`[CSRF] No token found for ${identifier}`);
    return false;
  }

  if (new Date() > stored.expiresAt) {
    await db.collection("csrf_tokens").deleteOne({ identifier });
    console.log(`[CSRF] Token expired for ${identifier}`);
    return false;
  }

  if (stored.token !== token) {
    console.log(`[CSRF] Token mismatch for ${identifier}`);
    console.log(`[CSRF] Expected: ${stored.token.substring(0, 8)}...`);
    console.log(`[CSRF] Received: ${token.substring(0, 8)}...`);
    return false;
  }

  console.log(`[CSRF] Token validated for ${identifier}`);
  return true;
};

// Consume token after successful verification
export const consumeCSRFToken = async (identifier) => {
  const client = await clientPromise;
  const db = client.db("techtrims");

  await db.collection("csrf_tokens").deleteOne({ identifier });
  console.log(`[CSRF] Token consumed for ${identifier}`);
};

// Original middleware for header-based CSRF (keep for other routes)
export const csrfMiddleware = (handler) => {
  return async (req, res) => {
    if (req.method === "GET") {
      return handler(req, res);
    }

    const token = req.headers["x-csrf-token"];
    if (!(await validateCSRFToken("global", token))) {
      return res.status(403).json({ message: "Invalid CSRF token" });
    }

    return handler(req, res);
  };
};
