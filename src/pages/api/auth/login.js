// src/pages/api/auth/login.js
import { checkRateLimit } from "../../../lib/rateLimit";
import { sanitizeInput } from "../../../lib/middleware/sanitize";
import { getRedirectPath, generateJWT } from "../../../lib/auth/roleResolver";
import { IdentityService } from "../../../lib/auth/identityService";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // ===== RATE LIMITING =====
    const clientIP =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const rateCheck = await checkRateLimit(
      `login:${clientIP}`,
      5,
      15 * 60 * 1000,
    );

    if (!rateCheck.allowed) {
      return res.status(429).json({
        message: `Too many login attempts. Try again in ${rateCheck.resetIn + 1} minutes.`,
        retryAfter: rateCheck.resetIn * 60,
      });
    }

    // ===== INPUT VALIDATION =====
    const { identifier, password, rememberMe } = sanitizeInput(req.body);

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // ✅ SECURITY: Verify credentials via IdentityService
    const verification = await IdentityService.verifyCredentials(
      identifier,
      password,
    );

    if (!verification.success) {
      console.log(`[Login Failed] ${verification.error}`);

      // Handle specific error cases
      if (verification.error === "ACCOUNT_LOCKED") {
        return res.status(423).json({
          message: verification.message,
          retryAfter: 15 * 60, // 15 minutes
        });
      }

      if (verification.error === "ACCOUNT_DEACTIVATED") {
        return res.status(403).json({
          message: verification.message,
        });
      }

      // Generic invalid credentials
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const identity = verification.identity;
    console.log(`[Login Success] ${identity.role} - ${identity.identifier}`);

    // ===== ROLE-SPECIFIC CHECKS =====

    // User email verification check
    if (identity.role === "USER" && !identity.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        requiresVerification: true,
        email: identity.identifier,
      });
    }

    // Barber availability check
    if (identity.role === "BARBER") {
      const barberData = await IdentityService.getDomainData(
        identity.linkedId,
        "BARBER",
      );
      if (barberData && barberData.isAvailable === false) {
        return res.status(403).json({
          message: "Your account has been deactivated. Contact salon owner.",
        });
      }
    }

    // ✅ SECURITY: Fetch domain data (users/salons/barbers)
    const domainData = await IdentityService.getDomainData(
      identity.linkedId,
      identity.role,
    );

    if (!domainData) {
      console.error(
        `❌ Domain data not found: ${identity.role} - ${identity.linkedId}`,
      );
      return res.status(500).json({
        message: "Account data error. Please contact support.",
      });
    }

    // ✅ SECURITY: Generate JWT with minimal payload
    const token = generateJWT(identity, rememberMe);

    // ===== SET COOKIES =====
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;

    // HttpOnly JWT cookie
    const cookieOptions = [
      `authToken=${token}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      `Max-Age=${maxAge}`,
    ];

    // Client-side role cookie
    const roleMap = {
      USER: "userAuth",
      SALON: "salonAuth",
      BARBER: "barberAuth",
    };

    const clientCookieOptions = [
      `${roleMap[identity.role]}=true`,
      "Path=/",
      "SameSite=Strict",
      `Max-Age=${maxAge}`,
    ];

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
        ...(identity.role === "BARBER" && {
          _id: domainData._id.toString(),
          id: domainData._id.toString(),
          name: domainData.name,
          email: domainData.email || "",
          phone: domainData.phone || "",
          salonId: domainData.salonId?.toString() || "",
          photo: domainData.photo || "",
          skills: domainData.skills || [],
          rating: domainData.rating || 5.0,
          totalBookings: domainData.totalBookings || 0,
          chairNumber: domainData.chairNumber || 1,
          experience: domainData.experience || 0,
          bio: domainData.bio || "",
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
