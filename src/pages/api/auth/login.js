// src/pages/api/auth/login.js

import { IdentityService } from "@/lib/auth/identityService";
import { getRedirectPath, generateJWT } from "@/lib/auth/roleResolver";
import { checkRateLimit } from "@/lib/rateLimit";
import { sanitizeInput, validateEmail } from "@/lib/middleware/sanitize";

/**
 * ✅ UNIFIED AUTO-DETECTING LOGIN ENDPOINT
 * Automatically detects if email belongs to USER or SALON
 * 
 * ✅ SECURITY FEATURES:
 * - Rate limiting (5 attempts / 15 min)
 * - Account lockout after failed attempts
 * - HttpOnly cookies (XSS protection)
 * - CSRF protection ready
 * - Timing-safe password comparison
 * - No user enumeration (generic error messages)
 * - Auto role detection (no client-side role parameter needed)
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // ✅ SECURITY: Rate limiting (IP-based)
    const clientIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const rateCheck = await checkRateLimit(
      `login:${clientIP}`,
      5,
      15 * 60 * 1000
    );

    if (!rateCheck.allowed) {
      return res.status(429).json({
        message: `Too many login attempts. Try again in ${
          rateCheck.resetIn || 1
        } minutes.`,
        retryAfter: rateCheck.resetIn * 60,
      });
    }

    // Parse and sanitize input
    const { identifier, password, rememberMe } = sanitizeInput(req.body);

    // Validate required fields
    if (!identifier || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Validate email format
    if (identifier.includes("@") && !validateEmail(identifier)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // ✅ SECURITY: Verify credentials (auto-detects role from database)
    const result = await IdentityService.verifyCredentials(
      identifier,
      password
    );

    if (!result.success) {
      // Handle specific error cases
      if (result.error === "ACCOUNT_LOCKED") {
        return res.status(403).json({
          message: result.message,
          code: "ACCOUNT_LOCKED",
        });
      }

      if (result.error === "ACCOUNT_DEACTIVATED") {
        return res.status(403).json({
          message: result.message,
          code: "ACCOUNT_DEACTIVATED",
        });
      }

      // Generic error (don't reveal if user exists)
      return res.status(401).json({
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    const { identity } = result;

    // ✅ SECURITY: Check email verification (USER accounts only)
    if (identity.role === "USER" && !identity.isVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
        requiresVerification: true,
        email: identity.identifier,
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    // ✅ SECURITY: Fetch domain data (users/salons/barbers)
    const domainData = await IdentityService.getDomainData(
      identity.linkedId,
      identity.role
    );

    if (!domainData) {
      console.error(
        `❌ Domain data not found: ${identity.role} - ${identity.linkedId}`
      );
      return res.status(500).json({
        message: "Account data error. Please contact support.",
      });
    }

    // ✅ SECURITY: Generate JWT with minimal payload
    const token = generateJWT(identity, rememberMe);

    // ✅ SECURITY: Set HttpOnly cookie (JavaScript cannot access)
    const cookieOptions = [
      `authToken=${token}`,
      "Path=/",
      "HttpOnly", // ✅ XSS Protection
      "SameSite=Strict", // ✅ CSRF Protection
      `Max-Age=${(rememberMe ? 7 : 3) * 24 * 60 * 60}`,
    ];

    // ✅ Set role-specific cookie name
    const authCookieName =
      identity.role === "USER"
        ? "userAuth"
        : identity.role === "SALON"
        ? "salonAuth"
        : "barberAuth";

    const clientCookieOptions = [
      `${authCookieName}=true`,
      "Path=/",
      "SameSite=Strict",
      `Max-Age=${(rememberMe ? 7 : 3) * 24 * 60 * 60}`,
    ];

    // ✅ SECURITY: Force HTTPS in production
    if (process.env.NODE_ENV === "production") {
      cookieOptions.push("Secure");
      clientCookieOptions.push("Secure");
    }

    // Set both cookies
    res.setHeader("Set-Cookie", [
      cookieOptions.join("; "),
      clientCookieOptions.join("; "),
    ]);

    // ✅ SUCCESS: Return user data (NO PASSWORD)
    return res.status(200).json({
      message: "Login successful",
      role: identity.role,
      redirectTo: getRedirectPath(identity.role),
      user: {
        _id: domainData._id,
        name: domainData.name || domainData.salonName,
        email: domainData.email,
        phone: domainData.phone || domainData.ownerDetails?.mobile,
        role: identity.role,
        // Include role-specific fields
        ...(identity.role === "USER" && {
          gender: domainData.gender,
          bookingHistory: domainData.bookingHistory || [],
          preferences: domainData.preferences || {},
        }),
        ...(identity.role === "SALON" && {
          salonName: domainData.salonName,
          services: domainData.services,
          ratings: domainData.ratings,
        }),
      },
    });
  } catch (error) {
    console.error("❌ Unified login error:", error);
    // ✅ SECURITY: Never expose internal errors
    return res.status(500).json({
      message: "An unexpected error occurred. Please try again.",
    });
  }
}
