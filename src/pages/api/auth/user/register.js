import clientPromise from "../../../../lib/mongodb";
import bcrypt from "bcryptjs";
import { generateOTP } from "../../../../lib/brevo_email/otpHelper";
import {
  brevoClient,
  brevoContactsApi,
} from "../../../../lib/brevo_email/brevoConfig";
import { otpEmailTemplate } from "../../../../lib/brevo_email/brevoTemplates";
import { generateCSRFToken } from "../../../../lib/middleware/csrf";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { name, email, phone, gender, password } = req.body;

    // Required fields validation
    if (!name || !email || !phone || !gender || !password) {
      return res.status(400).json({
        message: "All fields are required",
        required: ["name", "email", "phone", "gender", "password"],
      });
    }

    // Sanitize
    const sanitizedName = name.trim();
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedPhone = phone.trim();

    // Name validation
    if (sanitizedName.length < 3) {
      return res
        .status(400)
        .json({ message: "Name must be at least 3 characters long" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Phone validation (Indian)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(sanitizedPhone)) {
      return res.status(400).json({
        message:
          "Invalid phone number. Use 10-digit Indian format (starting with 6-9)",
      });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain at least one uppercase letter",
      });
    }

    if (!/[a-z]/.test(password)) {
      return res.status(400).json({
        message: "Password must contain at least one lowercase letter",
      });
    }

    if (!/[0-9]/.test(password)) {
      return res
        .status(400)
        .json({ message: "Password must contain at least one number" });
    }

    if (!/[!@#$%^&*]/.test(password)) {
      return res.status(400).json({
        message:
          "Password must contain at least one special character (!@#$%^&*)",
      });
    }

    // Gender validation
    if (!["male", "female", "other"].includes(gender.toLowerCase())) {
      return res.status(400).json({ message: "Invalid gender value" });
    }

    // MongoDB Connect
    const client = await clientPromise;
    const db = client.db("techtrims");
    const users = db.collection("users");
    const pendingUsers = db.collection("pending_users"); // NEW COLLECTION

    // Check if user already exists (VERIFIED user)
    const existingVerifiedUser = await users.findOne({
      $or: [{ email: sanitizedEmail }, { phone: sanitizedPhone }],
    });

    if (existingVerifiedUser) {
      return res.status(409).json({
        message: "User already exists with this email or phone number",
      });
    }

    // Check if pending registration exists
    const existingPending = await pendingUsers.findOne({
      $or: [{ email: sanitizedEmail }, { phone: sanitizedPhone }],
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Prepare user data
    const userData = {
      name: sanitizedName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      gender: gender.toLowerCase(),
      hashedPassword,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Expire in 1 hour
    };

    if (existingPending) {
      // Update existing pending registration
      await pendingUsers.updateOne(
        { email: sanitizedEmail },
        { $set: userData }
      );
      console.log("📝 Updated pending registration for:", sanitizedEmail);
    } else {
      // Create new pending registration
      await pendingUsers.insertOne(userData);
      console.log("✅ Created pending registration for:", sanitizedEmail);
    }

    // Generate OTP
    const otp = await generateOTP(sanitizedEmail);

    // Send verification email
    const sendSmtpEmail = {
      to: [{ email: sanitizedEmail, name: sanitizedName }],
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME,
      },
      ...otpEmailTemplate(sanitizedName, otp),
    };

    await brevoClient.sendTransacEmail(sendSmtpEmail);

    // Generate CSRF token
    const csrfToken = await generateCSRFToken(sanitizedEmail);

    // Respond
    return res.status(201).json({
      message: existingPending
        ? "OTP resent! Please verify your email."
        : "Registration initiated! Please verify your email.",
      requiresVerification: true,
      email: sanitizedEmail,
      csrfToken,
    });
  } catch (error) {
    console.error("User registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
