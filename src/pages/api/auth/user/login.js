import clientPromise from "../../../../lib/mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  sanitizeInput,
  validateEmail,
} from "../../../..//lib/middleware/sanitize";
import { checkRateLimit } from "../../../../lib/rateLimit";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Rate limiting - 5 attempts per 15 minutes
    const rateCheck = checkRateLimit(
      `login:${req.headers["x-forwarded-for"] || "unknown"}`,
      5,
      15 * 60 * 1000
    );
    if (!rateCheck.allowed) {
      return res.status(429).json({
        message: `Too many login attempts. Try again in ${rateCheck.resetIn} minutes.`,
        retryAfter: rateCheck.resetIn * 60,
      });
    }

    // Sanitize and validate input
    const { email, password } = sanitizeInput(req.body);

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

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ message: "Account is deactivated" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Update last login
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    // Create JWT token
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
        expiresIn: "7d",
        issuer: "techtrims-api",
        audience: "techtrims-app",
      }
    );

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

    res.status(200).json({
      message: "Login successful",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("User login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
