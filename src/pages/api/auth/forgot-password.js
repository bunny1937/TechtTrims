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
    });

    // ✅ SEND EMAIL
    const mailOptions = {
      from: `"TechTrims" <${process.env.GMAIL_USER}>`,
      to: normalizedEmail,
      subject: "🔐 Reset Your TechTrims Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              line-height: 1.6; 
              color: #333; 
              background: #f4f4f4;
            }
            .container { 
              max-width: 600px; 
              margin: 40px auto; 
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              padding: 40px 30px; 
              text-align: center; 
            }
            .header h1 { 
              color: white; 
              font-size: 28px;
              font-weight: 700;
              margin: 0;
            }
            .content { 
              padding: 40px 30px; 
            }
            .content p { 
              margin-bottom: 20px;
              color: #555;
              font-size: 16px;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .button { 
              display: inline-block; 
              padding: 16px 40px; 
              background: #667eea; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: 600;
              font-size: 16px;
              transition: background 0.3s;
            }
            .link-box {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
              word-break: break-all;
              font-size: 13px;
              color: #667eea;
              border: 1px solid #e9ecef;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .warning p {
              margin: 0;
              color: #856404;
              font-size: 14px;
            }
            .footer { 
              text-align: center; 
              padding: 20px 30px;
              background: #f8f9fa;
              font-size: 13px; 
              color: #999; 
            }
            .security-note {
              font-size: 13px;
              color: #6c757d;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e9ecef;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${user.name}</strong>,</p>
              <p>We received a request to reset your password for your TechTrims account.</p>
              
              <div class="button-container">
                <a href="${resetLink}" class="button">Reset My Password</a>
              </div>
              
              <p style="text-align: center; color: #999; font-size: 14px;">or copy and paste this link:</p>
              <div class="link-box">${resetLink}</div>
              
              <div class="warning">
                <p><strong>⚠️ Important:</strong> This link expires in 1 hour and can only be used once.</p>
              </div>
              
              <div class="security-note">
                <p><strong>Didn't request this?</strong></p>
                <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                <p style="margin-top: 10px;">For security reasons, this reset link will only work once and expires after 1 hour.</p>
              </div>
              
              <p style="margin-top: 30px;">Best regards,<br><strong>TechTrims Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} TechTrims. All rights reserved.</p>
              <p style="margin-top: 5px;">This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
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
