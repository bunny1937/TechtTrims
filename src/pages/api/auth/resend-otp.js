import { generateOTP } from "../../../lib/brevo_email/otpHelper";
import { brevoClient } from "../../../lib/brevo_email/brevoConfig";
import { otpEmailTemplate } from "../../../lib/brevo_email/brevoTemplates";
import clientPromise from "../../../lib/mongodb";
import { checkRateLimit } from "../../../lib/rateLimit";
import { generateCSRFToken } from "../../../lib/middleware/csrf";

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    "unknown"
  );
}

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
    const clientIp = getClientIp(req);

    // Rate limiting by EMAIL
    const emailRateCheck = checkRateLimit(
      `otp-email-${normalizedEmail}`,
      3,
      15 * 60 * 1000
    );

    if (!emailRateCheck.allowed) {
      return res.status(429).json({
        message: `Too many OTP requests. Try again in ${emailRateCheck.resetIn} minutes.`,
      });
    }

    // Rate limiting by IP
    const ipRateCheck = checkRateLimit(
      `otp-ip-${clientIp}`,
      10,
      60 * 60 * 1000
    );

    if (!ipRateCheck.allowed) {
      return res.status(429).json({
        message: "Too many requests from your network. Please try again later.",
      });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");
    const pendingUsers = db.collection("pending_users");

    const pendingUser = await pendingUsers.findOne({ email: normalizedEmail });

    if (!pendingUser) {
      return res.status(404).json({
        message: "Registration not found. Please register again.",
      });
    }

    // Generate new OTP
    let otp;
    try {
      otp = await generateOTP(normalizedEmail);
    } catch (otpError) {
      return res.status(429).json({
        message: otpError.message,
      });
    }

    // Send OTP email
    const sendSmtpEmail = {
      to: [{ email: normalizedEmail, name: pendingUser.name }],
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME,
      },
      ...otpEmailTemplate(pendingUser.name, otp),
    };

    await brevoClient.sendTransacEmail(sendSmtpEmail);

    // Generate new CSRF token
    const csrfToken = await generateCSRFToken(normalizedEmail);

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully!",
      csrfToken, // NEW CSRF token
      remaining: emailRateCheck.remaining,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
