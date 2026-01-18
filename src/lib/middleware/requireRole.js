// src/lib/middleware/requireRole.js
// ✅ UPDATED: Compatible with unified auth system (Jan 2026)

const { parse, serialize } = require("cookie");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");

/**
 * ✅ ROLE-BASED AUTHENTICATION MIDDLEWARE
 *
 * Usage (inline in API routes):
 * const { checkRole } = require("../../lib/middleware/requireRole");
 *
 * Then in handler:
 * const auth = await checkRole(req, res, ["USER", "SALON"]);
 * if (!auth) return; // Already responded with error
 */

/**
 * Check if user has required role
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Array<string>} allowedRoles - Array of allowed roles (e.g., ["USER", "SALON"])
 * @returns {Object|null} - Auth object with user data, or null if unauthorized
 */
async function checkRole(req, res, allowedRoles = []) {
  try {
    // Parse cookies
    const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
    const token = cookies.authToken;

    // No token
    if (!token) {
      res.status(401).json({
        message: "Authentication required",
        code: "NO_TOKEN",
      });
      return null;
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: "techtrims-api",
        audience: "techtrims-app",
      });
    } catch (error) {
      // Clear invalid cookies
      res.setHeader("Set-Cookie", [
        serialize("authToken", "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 0,
        }),
        serialize("userAuth", "", {
          path: "/",
          maxAge: 0,
        }),
      ]);

      res.status(401).json({
        message: "Invalid or expired token",
        code: "INVALID_TOKEN",
      });
      return null;
    }

    // ✅ CHECK ROLE AUTHORIZATION
    if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
      console.log(
        `❌ BLOCKED: ${decoded.role} tried to access [${allowedRoles.join(", ")}] only route`,
      );
      res.status(403).json({
        message: `Access denied. This route is for ${allowedRoles.join(" or ")} only.`,
        code: "FORBIDDEN",
        yourRole: decoded.role,
        requiredRoles: allowedRoles,
      });
      return null;
    }

    // Fetch domain data from appropriate collection
    const clientPromise = require("../mongodb").default;
    const client = await clientPromise;
    const db = client.db("techtrims");

    const collectionMap = {
      USER: "users",
      SALON: "salons",
      BARBER: "barbers",
    };

    const collection = collectionMap[decoded.role];
    let domainData = null;

    if (collection) {
      try {
        domainData = await db
          .collection(collection)
          .findOne(
            { _id: new ObjectId(decoded.linkedId) },
            { projection: { hashedPassword: 0 } },
          );
      } catch (error) {
        console.error("Failed to fetch domain data:", error);
      }
    }

    console.log(`✅ Access granted: ${decoded.role} (${decoded.linkedId})`);

    // Return auth object
    return {
      identityId: decoded.sub,
      role: decoded.role,
      linkedId: decoded.linkedId,
      domainData,
    };
  } catch (error) {
    console.error("❌ checkRole error:", error);
    res.status(500).json({
      message: "Internal server error",
      code: "SERVER_ERROR",
    });
    return null;
  }
}

/**
 * HOF version (for those who prefer wrapper pattern)
 * Usage: export default withRole(["USER", "SALON"])(handler);
 */
function withRole(allowedRoles = []) {
  return (handler) => {
    return async (req, res) => {
      const auth = await checkRole(req, res, allowedRoles);
      if (!auth) return; // Already responded with error

      // Attach to request
      req.auth = auth;
      req.domainData = auth.domainData;

      // Call handler
      return handler(req, res);
    };
  };
}

// Convenience exports
const withUser = withRole(["USER"]);
const withSalon = withRole(["SALON"]);
const withBarber = withRole(["BARBER"]);
const withUserOrSalon = withRole(["USER", "SALON"]);

module.exports = {
  checkRole,
  withRole,
  withUser,
  withSalon,
  withBarber,
  withUserOrSalon,
};
