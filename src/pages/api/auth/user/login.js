// pages/api/auth/login.js
import clientPromise from "../../../../lib/mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  sanitizeInput,
  validateEmail,
} from "../../../../lib/middleware/sanitize";
import { checkRateLimit } from "../../../../lib/rateLimit";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Rate limiting - 5 attempts per 15 minutes
    const rateCheck = await checkRateLimit(
      `login:${req.headers["x-forwarded-for"] || "unknown"}`,
      5,
      15 * 60 * 1000
    );
    if (!rateCheck.allowed) {
      return res.status(429).json({
        message: `Too many login attempts. Try again in ${
          rateCheck.resetIn || 1
        }  minutes.`,
        retryAfter: rateCheck.resetIn * 60,
      });
    }

    // ✅ GET rememberMe flag from request body
    const { email, password, rememberMe } = sanitizeInput(req.body);

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Find user by email
    const user = await db.collection("users").findOne({
      email: email.toLowerCase(),
      role: "user",
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // ✅ NEW: Check if email is not verified
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
        requiresVerification: true,
        email: user.email,
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
        requiresVerification: true,
        email: user.email,
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Update last login
    // await db.collection("users").updateOne(
    //   { _id: user._id },
    //   {
    //     $set: {
    //       lastLogin: new Date(),
    //       updatedAt: new Date(),
    //     },
    //   }
    // );

    // ✅ Create JWT token with dynamic expiry based on rememberMe
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        email: user.email,
        name: user.name,
        type: "access",
        jti: crypto.randomBytes(16).toString("hex"),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: rememberMe ? "7d" : "3d",
        issuer: "techtrims-api",
        audience: "techtrims-app",
      }
    );

    // SET HTTPONLY COOKIE SECURE - JavaScript CANNOT access
    // Set BOTH HttpOnly cookie (for API requests) AND readable cookie (for client-side checks)
    const cookieOptions = [
      `authToken=${token}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
    ];

    // Non-HttpOnly cookie for client-side auth check
    const clientCookieOptions = [`userAuth=true`, "Path=/", "SameSite=Strict"];

    if (process.env.NODE_ENV === "production") {
      cookieOptions.push("Secure");
      clientCookieOptions.push("Secure");
    }

    // Always set 30-day expiration
    const maxAge = `Max-Age=${(rememberMe ? 7 : 3) * 24 * 60 * 60}`;
    cookieOptions.push(maxAge);
    clientCookieOptions.push(maxAge);

    // Set BOTH cookies
    res.setHeader("Set-Cookie", [
      cookieOptions.join("; "),
      clientCookieOptions.join("; "),
    ]);

    // Return user data without sensitive info
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      role: user.role,
      bookingHistory: user.bookingHistory || [],
      preferences: user.preferences || {},
      createdAt: user.createdAt,
      lastLogin: new Date(),
    };

    // ❌ DON'T send token in response body (it's already in HttpOnly cookie)
    res.status(200).json({
      message: "Login successful",
      user: userResponse,
    });
  } catch (error) {
    console.error("User login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
