import clientPromise from "../../../lib/mongodb";
import { generateResetToken } from "../../../lib/resetToken";
import { checkRateLimit } from "../../../lib/rateLimit";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ✅ RATE LIMITING: 3 requests per hour per email
    const rateCheck = checkRateLimit(normalizedEmail, 3, 60 * 60 * 1000);

    if (!rateCheck.allowed) {
      return res.status(429).json({
        message: `Too many reset attempts. Please try again in ${rateCheck.resetIn} minutes.`,
        retryAfter: rateCheck.resetIn * 60,
      });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");
    const users = db.collection("users");

    const user = await users.findOne({ email: normalizedEmail });

    // ✅ SECURITY: Always return same message regardless of user existence
    if (!user) {
      // Simulate processing delay to prevent email enumeration
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 1000 + 500)
      );
      return res.status(200).json({
        message:
          "If an account exists with this email, a reset link has been sent.",
      });
    }

    // ✅ JWT TOKEN: Stateless, includes password hash validation
    const resetToken = generateResetToken(
      user._id,
      user.email,
      user.hashedPassword
    );

    const resetLink = `${
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    }/auth/reset-password?token=${resetToken}`;

    // ✅ NODEMAILER SETUP with Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      // ADD THESE OPTIONS
      tls: {
        rejectUnauthorized: false,
      },
    });

    // ✅ SEND EMAIL
    // In forgot-password.js - Update the email HTML
    const mailOptions = {
      from: `"TechTrims Support" <${process.env.GMAIL_USER}>`,
      to: normalizedEmail,
      subject: "Password Reset - TechTrims",
      // ADD THESE HEADERS
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        Importance: "high",
        "X-Mailer": "TechTrims Mailer",
        "Reply-To": process.env.GMAIL_USER,
      }, // Simpler subject (no emojis)
      html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background: white; border: 1px solid #ddd;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">TechTrims</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <p style="font-size: 16px;">Hello ${user.name},</p>
          
          <p style="font-size: 16px;">You requested to reset your password for your TechTrims account.</p>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="display: inline-block; 
                      padding: 14px 32px; 
                      background: #667eea; 
                      color: white; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      font-size: 16px;
                      font-weight: 600;">
              Reset Password
            </a>
          </p>
          
          <p style="font-size: 14px; color: #666;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          
          <p style="font-size: 13px; 
                    color: #667eea; 
                    word-break: break-all; 
                    background: #f5f5f5; 
                    padding: 12px; 
                    border-radius: 4px; 
                    border: 1px solid #e0e0e0;">
            ${resetLink}
          </p>
          
          <div style="background: #fff3cd; 
                      border-left: 4px solid #ffc107; 
                      padding: 12px; 
                      margin: 20px 0; 
                      border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>Important:</strong> This link expires in 1 hour and can only be used once.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 25px;">
            If you did not request this password reset, please ignore this email. 
            Your password will not be changed.
          </p>
          
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            Best regards,<br>
            <strong>TechTrims Team</strong>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f5f5f5; 
                    padding: 20px; 
                    text-align: center; 
                    border-top: 1px solid #ddd;">
          <p style="margin: 0; font-size: 12px; color: #999;">
            &copy; ${new Date().getFullYear()} TechTrims. All rights reserved.
          </p>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,
      // ADD PLAIN TEXT VERSION (helps with spam filters)
      text: `
Hello ${user.name},

You requested to reset your password for your TechTrims account.

Click here to reset your password:
${resetLink}

This link expires in 1 hour and can only be used once.

If you did not request this password reset, please ignore this email.

Best regards,
TechTrims Team
  `,
    };

    await transporter.sendMail(mailOptions);

    console.log("✅ Password reset email sent:", {
      email: normalizedEmail,
      remaining: rateCheck.remaining,
    });

    return res.status(200).json({
      message:
        "If an account exists with this email, a reset link has been sent.",
      rateLimitRemaining: rateCheck.remaining,
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    // ✅ NEVER expose internal errors or password hashes
    return res.status(500).json({
      message: "An error occurred. Please try again later.",
    });
  }
}
