import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "your-super-secret-jwt-key-change-this-in-production";
const RESET_TOKEN_EXPIRY = "1h"; // 1 hour

/**
 * Generate JWT-based password reset token
 * Stateless - no DB storage needed
 */
export function generateResetToken(userId, email, currentPasswordHash) {
  // Include password hash in payload so token becomes invalid if password changes
  const payload = {
    userId: userId.toString(),
    email: email.toLowerCase(),
    passwordHash: crypto
      .createHash("sha256")
      .update(currentPasswordHash)
      .digest("hex")
      .substring(0, 16), // First 16 chars of hash
    type: "password_reset",
    iat: Math.floor(Date.now() / 1000),
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: RESET_TOKEN_EXPIRY,
    issuer: "techtrims-auth",
    audience: "password-reset",
  });

  return token;
}

/**
 * Verify and decode reset token
 */
export function verifyResetToken(token, currentPasswordHash) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "techtrims-auth",
      audience: "password-reset",
    });

    // Verify password hasn't changed since token was issued
    const currentHashPrefix = crypto
      .createHash("sha256")
      .update(currentPasswordHash)
      .digest("hex")
      .substring(0, 16);

    if (decoded.passwordHash !== currentHashPrefix) {
      return {
        valid: false,
        error: "Token is no longer valid. Password may have been changed.",
      };
    }

    return {
      valid: true,
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return {
        valid: false,
        error: "Reset link has expired. Please request a new one.",
      };
    }
    return {
      valid: false,
      error: "Invalid reset token.",
    };
  }
}
