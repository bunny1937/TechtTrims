// src/pages/api/auth/login.js
import { checkRateLimit } from "../../../lib/rateLimit";
import { sanitizeInput } from "../../../lib/middleware/sanitize";
import { getRedirectPath, generateJWT } from "../../../lib/auth/roleResolver";
import { IdentityService } from "../../../lib/auth/identityService";
import { verifyGoogleIdToken } from "@/lib/auth/googleVerifier";
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // ===== GOOGLE LOGIN FLOW =====
  if (req.body.method === "google") {
    const clientIP =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

    const rateCheck = await checkRateLimit(
      `google-login:${clientIP}`,
      5,
      15 * 60 * 1000,
    );

    if (!rateCheck.allowed) {
      return res.status(429).json({
        message: "Too many Google login attempts. Try again later.",
      });
    }

    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({
          message: "Missing Google ID token",
        });
      }

      const googleUser = await verifyGoogleIdToken(idToken);

      const client = await clientPromise;
      const db = client.db("techtrims");
      const authIdentities = db.collection("auth_identities");

      // 🔍 Find Google identity using correct field name
      const identity = await authIdentities.findOne({
        provider: "google",
        providerSubject: googleUser.providerSubject,
        isActive: true,
      });

      if (!identity) {
        return res.status(401).json({
          message:
            "No account linked with this Google account. Please login with email/password first, then link your Google account.",
        });
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

      // 🔍 ROLE RESOLUTION - Generate JWT with rememberMe=false for Google login
      const token = generateJWT(identity, false);

      // ===== SET COOKIES (EXACT SAME AS EMAIL/PASSWORD) =====
      const maxAge = 7 * 24 * 60 * 60; // 7 days (no rememberMe for Google)

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

      // Update last login time
      await authIdentities.updateOne(
        { _id: identity._id },
        {
          $set: {
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          },
        },
      );

      console.log(
        `[Google Login Success] ${identity.role} - ${identity.identifier}`,
      );

      // ✅ SUCCESS: Return EXACT SAME user data structure as email/password
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
      console.error("❌ Google login error:", error);
      return res.status(500).json({
        message: "Google login failed. Please try again.",
      });
    }
  }

  // ===== EMAIL/PASSWORD LOGIN FLOW =====
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
      console.error(`[Login Failed] ${verification.error}`);

      // Generic invalid credentials
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const identity = verification.identity;

    // ===== GOOGLE LINKING FLOW (OPTIONAL) =====
    const { linkGoogle } = req.query;

    if (linkGoogle === "true") {
      const { googleIdToken } = req.body;

      if (!googleIdToken) {
        return res.status(400).json({
          message: "Missing Google token for linking",
        });
      }

      try {
        const googleUser = await verifyGoogleIdToken(googleIdToken);

        // Email must match logged-in user
        if (googleUser.email !== identity.identifier) {
          return res.status(403).json({
            message: "Google account email mismatch",
          });
        }

        const client = await clientPromise;
        const db = client.db("techtrims");
        const authIdentities = db.collection("auth_identities");

        // Prevent duplicate google identity
        const existingGoogle = await authIdentities.findOne({
          provider: "google",
          providerSubject: googleUser.providerSubject,
        });

        if (existingGoogle) {
          return res.status(409).json({
            message: "Google account already linked to another user",
          });
        }

        // 🔗 LINK GOOGLE IDENTITY
        await authIdentities.insertOne({
          role: identity.role,
          identifier: googleUser.email,
          provider: "google",
          providerSubject: googleUser.providerSubject,
          passwordHash: null,
          linkedId: identity.linkedId,
          isActive: true,
          isVerified: true,
          loginAttempts: 0,
          lockedUntil: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`✅ Google account linked for ${identity.identifier}`);
      } catch (linkError) {
        console.error("❌ Google linking failed:", linkError);
        // Continue with normal login even if linking fails
      }
    }

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
