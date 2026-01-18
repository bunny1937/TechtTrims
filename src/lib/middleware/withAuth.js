// src/lib/middleware/withAuth.js
// ✅ UPDATED: Now uses auth_identities system
import { parse, serialize } from "cookie";
import { verifyJWT } from "../auth/roleResolver";
import { IdentityService } from "../auth/identityService";

/**
 * ✅ UNIFIED AUTH MIDDLEWARE
 * Works with new auth_identities system
 * Backward compatible with existing routes
 */
export function withAuth(handler) {
  return async (req, res) => {
    try {
      // Parse cookies
      const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
      const token = cookies.authToken;

      // No token
      if (!token) {
        console.log("❌ No authentication token");
        return res.status(401).json({
          message: "Authentication required",
          code: "NO_TOKEN",
        });
      }

      // Verify JWT using new system
      const decoded = verifyJWT(token);

      if (!decoded) {
        console.log("❌ Invalid token");

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

        return res.status(401).json({
          message: "Invalid or expired token",
          code: "INVALID_TOKEN",
        });
      }

      // ✅ NEW: Attach auth info to request (unified format)
      req.auth = {
        identityId: decoded.sub, // auth_identities._id
        role: decoded.role, // USER | SALON | BARBER
        linkedId: decoded.linkedId, // users._id | salons._id | barbers._id
      };

      // ✅ BACKWARD COMPATIBILITY: Old code expects req.user
      req.user = {
        userId: decoded.linkedId, // For backward compatibility
        role: decoded.role,
        // Add more fields as needed by existing code
      };

      console.log(`✅ Authenticated: ${decoded.role} (${decoded.linkedId})`);

      // Call handler
      return handler(req, res);
    } catch (error) {
      console.error("❌ Auth middleware error:", error);
      return res.status(500).json({
        message: "Internal server error",
        code: "SERVER_ERROR",
      });
    }
  };
}
