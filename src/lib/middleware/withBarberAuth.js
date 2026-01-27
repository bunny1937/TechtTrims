// src/lib/middleware/withBarberAuth.js
import { parse, serialize } from "cookie";
import jwt from "jsonwebtoken";
import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";

/**
 * Barber-specific authentication middleware
 * Ensures only BARBER role can access protected routes
 */
export function withBarberAuth(handler) {
  return async (req, res) => {
    try {
      // Parse cookies
      const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
      const token = cookies.authToken;

      if (!token) {
        console.log("[Barber Auth] No token provided");
        return res.status(401).json({
          message: "Authentication required",
          code: "NO_TOKEN",
        });
      }

      // Verify JWT
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, {
          issuer: "techtrims-api",
          audience: "techtrims-app",
        });
      } catch (error) {
        console.log("[Barber Auth] Token verification failed:", error.message);

        // Clear invalid cookies
        res.setHeader("Set-Cookie", [
          serialize("authToken", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 0,
          }),
          serialize("barberAuth", "", {
            path: "/",
            maxAge: 0,
          }),
        ]);

        return res.status(401).json({
          message: "Invalid or expired token",
          code: "INVALID_TOKEN",
        });
      }

      // CHECK ROLE - MUST BE BARBER
      if (decoded.role !== "BARBER") {
        console.log(
          "[Barber Auth] BLOCKED:",
          decoded.role,
          "tried to access BARBER route",
        );
        return res.status(403).json({
          message: "Access denied. This route is for barbers only.",
          code: "FORBIDDEN",
          yourRole: decoded.role,
          requiredRole: "BARBER",
        });
      }

      // Fetch barber data from database
      const client = await clientPromise;
      const db = client.db("techtrims");

      const barber = await db
        .collection("barbers")
        .findOne(
          { _id: new ObjectId(decoded.linkedId) },
          { projection: { hashedPassword: 0 } },
        );

      if (!barber) {
        console.log("[Barber Auth] Barber not found in database");
        return res.status(404).json({
          message: "Barber account not found",
          code: "NOT_FOUND",
        });
      }

      if (barber.isAvailable === false) {
        return res.status(403).json({
          message: "Your account has been deactivated",
          code: "ACCOUNT_DISABLED",
        });
      }

      // Attach barber info to request
      req.barber = {
        id: barber._id.toString(),
        name: barber.name,
        email: barber.email,
        phone: barber.phone,
        salonId: barber.salonId?.toString(),
        photo: barber.photo,
        skills: barber.skills,
        rating: barber.rating,
        totalBookings: barber.totalBookings,
        currentStatus: barber.currentStatus,
      };

      req.auth = {
        identityId: decoded.sub,
        role: decoded.role,
        linkedId: decoded.linkedId,
      };

      console.log("[Barber Auth] Access granted:", barber.name, barber._id);

      // Call handler
      return handler(req, res);
    } catch (error) {
      console.error("[Barber Auth] Middleware error:", error);
      return res.status(500).json({
        message: "Internal server error",
        code: "SERVER_ERROR",
      });
    }
  };
}
