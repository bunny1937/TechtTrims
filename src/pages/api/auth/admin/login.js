import clientPromise from "../../../../lib/mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  logAdminAction,
  AuditActions,
  getClientIP,
} from "../../../../lib/auditLogger";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Find admin
    const admin = await db.collection("admins").findOne({ username });

    if (!admin || !(await bcrypt.compare(password, admin.hashedPassword))) {
      // ✅ Log failed login attempt
      await logAdminAction({
        adminId: "unknown",
        adminUsername: username || "unknown",
        action: AuditActions.LOGIN,
        resource: "Admin",
        resourceId: admin?._id?.toString() || "unknown",
        details: {
          reason: !admin ? "Admin not found" : "Invalid password",
          attemptedUsername: username,
        },
        ipAddress: getClientIP(req),
        userAgent: req.headers["user-agent"],
        status: "FAILURE",
        errorMessage: "Invalid credentials",
      });

      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, admin.hashedPassword);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Generate token
    const token = jwt.sign(
      { adminId: admin._id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" } // ✅ 30 days token
    );

    // ✅ SET HTTPONLY COOKIE
    const cookieOptions = [
      `adminToken=${token}`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Strict`,
    ];

    if (process.env.NODE_ENV === "production") {
      cookieOptions.push(`Secure`);
    }

    // ✅ 30 days persistent cookie
    cookieOptions.push(`Max-Age=${30 * 24 * 60 * 60}`);

    res.setHeader("Set-Cookie", cookieOptions.join("; "));

    // Remove password from response
    const { hashedPassword, ...adminData } = admin;
    // ✅ Log successful login
    await logAdminAction({
      adminId: admin._id.toString(),
      adminUsername: admin.username,
      action: AuditActions.LOGIN,
      resource: "Admin",
      resourceId: admin._id.toString(),
      details: {
        role: admin.role,
        loginTime: new Date(),
      },
      ipAddress: getClientIP(req),
      userAgent: req.headers["user-agent"],
      status: "SUCCESS",
    });

    // ❌ DON'T send token in response
    res.status(200).json({
      message: "Login successful",
      admin: adminData,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
