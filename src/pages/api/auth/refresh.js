// pages/api/auth/refresh.js

import jwt from "jsonwebtoken";
import clientPromise from "../../../lib/mongodb";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const refreshToken = req.cookies.refreshToken;
    console.log("🔥 refreshToken exists:", !!refreshToken);

    if (!refreshToken) {
      console.log("❌ NO REFRESH TOKEN IN COOKIES");
      return res
        .status(401)
        .json({ message: "No refresh token", code: "NO_REFRESH_TOKEN" });
    }

    let decoded;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      );
    } catch (e) {
      console.error("❌ Refresh token verification failed:", e.message);
      return res
        .status(401)
        .json({ message: "Invalid refresh token", code: "INVALID_TOKEN" });
    }

    const userId = decoded.userId;
    const client = await clientPromise;
    const db = client.db("techtrims");

    // Check if session exists in DB
    const session = await db.collection("userRefreshTokens").findOne({
      userId: userId,
    });

    if (!session) {
      return res
        .status(401)
        .json({ message: "Session expired", code: "SESSION_EXPIRED" });
    }

    // Check if session has expired
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      await db.collection("userRefreshTokens").deleteOne({ userId: userId });
      return res
        .status(401)
        .json({ message: "Session expired", code: "SESSION_EXPIRED" });
    }

    // Verify token hash
    const storedHash = session.tokenHash;
    if (!storedHash) {
      return res
        .status(401)
        .json({ message: "Corrupted session", code: "CORRUPTED_SESSION" });
    }

    const currentHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    if (storedHash !== currentHash) {
      return res
        .status(401)
        .json({ message: "Refresh token mismatch", code: "TOKEN_MISMATCH" });
    }

    // 🔥 GET USER DATA for new token
    const user = await db.collection("users").findOne({ _id: session.userId });
    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({ message: "User not found or inactive", code: "USER_INACTIVE" });
    }

    // Generate NEW access token (15m)
    const newAccessToken = jwt.sign(
      {
        userId: userId,
        role: user.role,
        email: user.email,
        type: "access",
      },
      process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    // 🔥 ROTATE REFRESH TOKEN (Generate new one)
    const newRefreshToken = jwt.sign(
      {
        userId: userId,
        type: "refresh",
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: session.rememberMe ? "30d" : "7d" },
    );

    // 🔥 Update DB with new refresh token hash
    const newRefreshHash = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");
    const refreshTtlSeconds = session.rememberMe
      ? 30 * 24 * 60 * 60
      : 7 * 24 * 60 * 60;

    await db.collection("userRefreshTokens").updateOne(
      { userId: userId },
      {
        $set: {
          tokenHash: newRefreshHash,
          lastRefreshedAt: new Date(),
          expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
        },
      },
    );

    const isProd = process.env.NODE_ENV === "production";

    res.setHeader("Set-Cookie", [
      `authToken=${newAccessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
        15 * 60
      }${isProd ? "; Secure" : ""}`,
      `refreshToken=${newRefreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${refreshTtlSeconds}${
        isProd ? "; Secure" : ""
      }`,
      `userAuth=true; Path=/; SameSite=Lax; Max-Age=${refreshTtlSeconds}${
        isProd ? "; Secure" : ""
      }`,
    ]);

    return res.status(200).json({
      success: true,
      message: "Tokens refreshed",
    });
  } catch (error) {
    console.error("❌ Refresh error:", error);
    return res
      .status(500)
      .json({ message: "Server error", code: "SERVER_ERROR" });
  }
}
