import { generateOTP } from "../../../lib/brevo_email/otpHelper";
import { brevoClient } from "../../../lib/brevo_email/brevoConfig";
import { otpEmailTemplate } from "../../../lib/brevo_email/brevoTemplates";
import clientPromise from "../../../lib/mongodb";
import { checkRateLimit } from "../../../lib/rateLimit";
import { generateCSRFToken } from "../../../lib/middleware/csrf";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting
    const rateCheck = checkRateLimit(
      `resend-verification-${normalizedEmail}`,
      3,
      15 * 60 * 1000
    );

    if (!rateCheck.allowed) {
      return res.status(429).json({
        message: `Too many requests. Try again in ${rateCheck.resetIn} minutes.`,
      });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");
    const users = db.collection("users");

    // Check if user exists and is unverified
    const user = await users.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "Email already verified. Please login.",
      });
    }

    // Generate OTP
    const otp = await generateOTP(normalizedEmail);

    // Send email
    const sendSmtpEmail = {
      to: [{ email: normalizedEmail, name: user.name }],
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME,
      },
      ...otpEmailTemplate(user.name, otp),
    };

    await brevoClient.sendTransacEmail(sendSmtpEmail);

    // Generate CSRF token
    const csrfToken = await generateCSRFToken(normalizedEmail);

    return res.status(200).json({
      success: true,
      message: "Verification email sent!",
      csrfToken,
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
