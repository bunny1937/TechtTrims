import clientPromise from "../../../lib/mongodb";
import { verifyOTP } from "../../../lib/brevo_email/otpHelper";
import {
  validateCSRFToken,
  consumeCSRFToken,
} from "../../../lib/middleware/csrf";
import { brevoContactsApi } from "../../../lib/brevo_email/brevoConfig";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email, otp, csrfToken } = req.body;

    console.log("=== OTP VERIFICATION DEBUG ===");
    console.log("Email received:", email);
    console.log("OTP received:", otp);

    if (!email || !otp) {
      return res
        .status(400)
        .json({ message: "Email, OTP and security token are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify CSRF
    const csrfValid = await validateCSRFToken(csrfToken);
    if (!csrfValid) {
      console.log("❌ CSRF validation failed");
      return res.status(403).json({
        message: "Invalid or expired security token. Please register again.",
      });
    }

    console.log("✅ CSRF validated");

    // Verify OTP
    const verification = await verifyOTP(normalizedEmail, otp);
    console.log("Verification result:", verification);

    if (!verification.success) {
      return res.status(400).json({
        message: verification.message,
        attemptsLeft: verification.attemptsLeft,
      });
    }

    // OTP SUCCESS - now consume CSRF token
    await consumeCSRFToken();

    const client = await clientPromise;
    const db = client.db("techtrims");
    const pendingUsers = db.collection("pending_users");
    const users = db.collection("users");

    // ✅ CHECK BOTH COLLECTIONS

    // 1. Check pending_users (new registrations)
    const pendingUser = await pendingUsers.findOne({ email: normalizedEmail });

    if (pendingUser) {
      console.log("📝 Found in pending_users - Creating new user");

      // Create actual user from pending data
      const newUser = {
        name: pendingUser.name,
        email: pendingUser.email,
        phone: pendingUser.phone,
        gender: pendingUser.gender,
        role: "user",
        hashedPassword: pendingUser.hashedPassword,
        bookingHistory: [],
        preferences: {},
        resetPasswordToken: null,
        resetPasswordExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        isVerified: true, // ✅ Already verified
        verifiedAt: new Date(),
      };

      const result = await users.insertOne(newUser);
      console.log("✅ User created with ID:", result.insertedId);

      const authIdentities = db.collection("auth_identities");

      await authIdentities.insertOne({
        role: "USER",
        identifier: pendingUser.email, // email used for login
        provider: "local", // important (not google)
        providerSubject: null,
        passwordHash: pendingUser.hashedPassword, // 🔥 critical
        linkedId: result.insertedId, // link to users collection
        isActive: true,
        isVerified: true,
        loginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });

      // Delete pending registration
      await pendingUsers.deleteOne({ email: normalizedEmail });
      console.log("🗑️ Deleted pending registration");

      // Add to Brevo contact list
      try {
        await brevoContactsApi.createContact({
          email: pendingUser.email,
          attributes: {
            FIRSTNAME: pendingUser.name,
            SMS: `+91${pendingUser.phone}`,
            GENDER: pendingUser.gender,
          },
          listIds: [2],
          updateEnabled: true,
        });
      } catch (contactError) {
        console.log(
          "Brevo contact add error:",
          contactError.response?.body || contactError.message,
        );
      }

      return res.status(200).json({
        success: true,
        message: "Email verified successfully! Welcome to TechTrims!",
        user: {
          name: newUser.name,
          email: newUser.email,
        },
      });
    }

    // 2. Check users (old unverified accounts)
    const existingUser = await users.findOne({ email: normalizedEmail });

    if (existingUser) {
      console.log("👤 Found in users collection");

      if (existingUser.isVerified) {
        return res.status(400).json({
          message: "Email already verified. Please login.",
        });
      }

      // Update existing user to verified
      const result = await users.findOneAndUpdate(
        { email: normalizedEmail },
        {
          $set: {
            isVerified: true,
            verifiedAt: new Date(),
          },
        },
        { returnDocument: "after" },
      );

      const user = result.value || result;

      console.log("✅ User verified:", user.email);

      // Add to Brevo if not already added
      try {
        await brevoContactsApi.createContact({
          email: user.email,
          attributes: {
            FIRSTNAME: user.name,
            SMS: `+91${user.phone}`,
            GENDER: user.gender,
          },
          listIds: [2],
          updateEnabled: true,
        });
      } catch (contactError) {
        console.log(
          "Brevo contact add (may already exist):",
          contactError.message,
        );
      }

      return res.status(200).json({
        success: true,
        message: "Email verified successfully! Welcome to TechTrims!",
        user: {
          name: user.name,
          email: user.email,
        },
      });
    }

    // Not found in either collection
    return res.status(404).json({
      message: "Registration not found. Please register again.",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
