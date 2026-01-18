// src/pages/api/auth/login.js
import unifiedLoginHandler from "../login.js";

export default async function handler(req, res) {
  const useUnifiedAuth = process.env.USE_UNIFIED_AUTH === "true";

  if (useUnifiedAuth) {
    console.log("🔄 Routing to unified auth system (USER)");

    // Create new body object
    const mappedBody = {
      identifier: req.body.email || req.body.identifier,
      password: req.body.password,
      role: "USER",
      rememberMe: req.body.rememberMe || false,
    };

    // Replace body
    req.body = mappedBody;

    return unifiedLoginHandler(req, res);
  }

  return res.status(503).json({ message: "Legacy login disabled." });
}
