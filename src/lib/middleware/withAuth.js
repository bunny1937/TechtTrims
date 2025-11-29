import { parse, serialize } from "cookie";
import jwt from "jsonwebtoken";

/**
 * Secure authentication middleware for API routes
 * Extracts and verifies HttpOnly cookie token
 * @param {Function} handler - Your API route handler
 * @returns {Function} - Wrapped handler with auth check
 */
export function withAuth(handler) {
  return async (req, res) => {
    try {
      // Parse cookies from request headers
      const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
      const token = cookies.authToken;

      // No token - Unauthorized
      if (!token) {
        console.log("❌ No authentication token provided");
        return res.status(401).json({
          message: "Authentication required",
          code: "NO_TOKEN",
        });
      }

      // Verify JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, {
          issuer: "techtrims-api",
          audience: "techtrims-app",
        });
      } catch (error) {
        console.log("❌ Token verification failed:", error.message);

        // Clear invalid cookie
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

      // Attach user info to request object
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name,
      };

      console.log("✅ User authenticated:", req.user.userId);

      // Call the actual API handler
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
