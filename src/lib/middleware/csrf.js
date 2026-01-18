// src/lib/middleware/csrf.js
import { randomBytes } from "crypto";
import clientPromise from "../mongodb";

// ✅ FIX: Use consistent "session" identifier for all requests
export const generateCSRFToken = async () => {
  const token = randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const client = await clientPromise;
  const db = client.db("techtrims");

  await db.collection("csrf_tokens").updateOne(
    { identifier: "session" }, // ✅ FIXED: Always use "session"
    {
      $set: {
        token,
        expiresAt: expiry,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );

  console.log(`✅ [CSRF] Token generated: ${token.substring(0, 8)}...`);
  return token;
};

// ✅ Consume (delete) CSRF token after successful use
export const consumeCSRFToken = async (identifier = "session") => {
  const client = await clientPromise;
  const db = client.db("techtrims");

  await db.collection("csrf_tokens").deleteOne({ identifier });
  console.log(`✅ [CSRF] Token consumed for: ${identifier}`);
};

// ✅ FIX: Validate with "session" identifier
export const validateCSRFToken = async (token) => {
  if (!token) {
    console.log("❌ [CSRF] No token provided");
    return false;
  }

  const client = await clientPromise;
  const db = client.db("techtrims");
  const stored = await db
    .collection("csrf_tokens")
    .findOne({ identifier: "session" });

  if (!stored) {
    console.log("❌ [CSRF] No token in database");
    return false;
  }

  if (new Date() > stored.expiresAt) {
    await db.collection("csrf_tokens").deleteOne({ identifier: "session" });
    console.log("❌ [CSRF] Token expired");
    return false;
  }

  if (stored.token !== token) {
    console.log("❌ [CSRF] Token mismatch");
    console.log(`   Expected: ${stored.token.substring(0, 8)}...`);
    console.log(`   Received: ${token.substring(0, 8)}...`);
    return false;
  }

  console.log("✅ [CSRF] Token validated successfully");
  return true;
};

// ✅ FIX: Middleware now validates correctly
export const csrfMiddleware = (handler) => {
  return async (req, res) => {
    if (req.method === "GET") {
      return handler(req, res);
    }

    const token = req.headers["x-csrf-token"];

    console.log("🔐 [CSRF] Validating token:", token?.substring(0, 8) + "...");

    if (!(await validateCSRFToken(token))) {
      console.log("🚫 [CSRF] Validation failed");
      return res.status(403).json({ message: "Invalid CSRF token" });
    }

    console.log("✅ [CSRF] Validation passed");
    return handler(req, res);
  };
};
