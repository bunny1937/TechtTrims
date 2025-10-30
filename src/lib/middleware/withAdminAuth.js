// lib/middleware/withAdminAuth.js
import { parse, serialize } from "cookie";
import jwt from "jsonwebtoken";

export function withAdminAuth(handler) {
  return async (req, res) => {
    try {
      const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
      const token = cookies.adminToken;

      if (!token) {
        console.log("❌ No admin token provided");
        return res.status(401).json({
          message: "Admin authentication required",
          code: "NO_TOKEN",
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        console.log("❌ Admin token verification failed:", error.message);

        res.setHeader(
          "Set-Cookie",
          serialize("adminToken", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 0,
          })
        );

        return res.status(401).json({
          message: "Invalid or expired admin token",
          code: "INVALID_TOKEN",
        });
      }

      req.admin = {
        adminId: decoded.adminId,
        username: decoded.username,
        role: decoded.role,
        // ✅ Add helper methods
        getClientIP: () => {
          return (
            req.headers["x-forwarded-for"]?.split(",")[0] ||
            req.headers["x-real-ip"] ||
            req.socket.remoteAddress ||
            "unknown"
          );
        },
        getUserAgent: () => req.headers["user-agent"] || "unknown",
      };

      console.log("✅ Admin authenticated:", req.admin.adminId);

      return handler(req, res);
    } catch (error) {
      console.error("❌ Admin auth middleware error:", error);
      return res.status(500).json({
        message: "Internal server error",
        code: "SERVER_ERROR",
      });
    }
  };
}
