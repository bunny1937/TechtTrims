// src/lib/auth/roleResolver.js
import jwt from "jsonwebtoken";
import crypto from "crypto";

/**
 * ✅ SECURITY: Role-based routing and JWT generation
 * JWT contains ONLY non-sensitive data
 */

/**
 * Get redirect path based on role
 */
export function getRedirectPath(role) {
  const redirectMap = {
    USER: "/user/dashboard",
    SALON: "/salons/dashboard",
    BARBER: "/barber/dashboard", // Future implementation
  };

  return redirectMap[role] || "/";
}

/**
 * ✅ CRITICAL: Generate secure JWT token
 * Token contains:
 * - identityId (auth_identities._id)
 * - role (USER/SALON/BARBER)
 * - linkedId (users._id OR salons._id OR barbers._id)
 *
 * ❌ NEVER include:
 * - Passwords
 * - Email addresses
 * - Sensitive user data
 */
export function generateJWT(identity, rememberMe = false) {
  const payload = {
    // ✅ SECURITY: Minimal payload
    sub: identity._id.toString(), // Identity ID
    role: identity.role,
    linkedId: identity.linkedId.toString(), // Domain object ID
    type: "access",
    jti: crypto.randomBytes(16).toString("hex"), // Unique token ID (for revocation)
  };

  const expiresIn = rememberMe ? "7d" : "3d";

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
    issuer: "techtrims-api",
    audience: "techtrims-app",
  });
}

/**
 * Verify and decode JWT token
 */
export function verifyJWT(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "techtrims-api",
      audience: "techtrims-app",
    });

    if (decoded.type !== "access") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return null;
  }
}

/**
 * Get user-friendly role name
 */
export function getRoleName(role) {
  const roleNames = {
    USER: "Customer",
    SALON: "Salon Owner",
    BARBER: "Barber",
  };

  return roleNames[role] || role;
}

/**
 * Check if role has permission
 * (For future role-based access control)
 */
export function hasPermission(role, requiredPermissions) {
  const rolePermissions = {
    USER: ["booking.create", "booking.view", "feedback.submit"],
    SALON: [
      "salon.manage",
      "booking.manage",
      "barber.manage",
      "analytics.view",
    ],
    BARBER: ["booking.view", "queue.manage"],
  };

  const permissions = rolePermissions[role] || [];

  return requiredPermissions.every((perm) => permissions.includes(perm));
}
