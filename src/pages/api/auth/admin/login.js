import clientPromise from "../../../../lib/mongodb";
import bcryptjs from "bcryptjs"; // ✅ Change this
import jwt from "jsonwebtoken";
import {
  logAdminAction,
  AuditActions,
  getClientIP,
} from "../../../../lib/auditLogger";

const bcrypt = bcryptjs; // ✅ Add this

export default async function handler(req, res) {
  console.log("🔵 [ADMIN LOGIN] Request received");

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { username, password } = req.body;
    console.log(
      "🔵 [ADMIN LOGIN] Username:",
      username,
      "Password length:",
      password?.length
    );

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const admin = await db.collection("admins").findOne({ username });
    console.log("🔵 [ADMIN LOGIN] Admin found:", !!admin);

    if (!admin) {
      console.log("❌ [ADMIN LOGIN] Admin not found");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log(
      "🔵 [ADMIN LOGIN] Comparing password. Hash exists:",
      !!admin.hashedPassword
    );
    const isPasswordValid = await bcrypt.compare(
      password,
      admin.hashedPassword
    );
    console.log("🔵 [ADMIN LOGIN] Password valid:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("❌ [ADMIN LOGIN] Password invalid");
      await logAdminAction(
        "unknown",
        username,
        AuditActions.LOGIN,
        "Admin",
        admin._id.toString(),
        { reason: "Invalid password" },
        getClientIP(req),
        req.headers["user-agent"],
        "FAILURE",
        "Invalid password"
      );
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("✅ [ADMIN LOGIN] Password verified successfully");

    const token = jwt.sign(
      {
        adminId: admin._id,
        username: admin.username,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    console.log("🔵 [ADMIN LOGIN] JWT generated:", !!token);

    res.setHeader("Set-Cookie", [
      `adminToken=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${
        30 * 24 * 60 * 60
      }`,
      ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
    ]);
    console.log("🔵 [ADMIN LOGIN] Cookie set");

    const { hashedPassword, ...adminData } = admin;

    console.log("🔵 [ADMIN LOGIN] Logging success...");
    await logAdminAction(
      admin._id.toString(),
      admin.username,
      AuditActions.LOGIN,
      "Admin",
      admin._id.toString(),
      { role: admin.role, loginTime: new Date() },
      getClientIP(req),
      req.headers["user-agent"],
      "SUCCESS"
    );
    console.log("🔵 [ADMIN LOGIN] Success logged");

    console.log("✅ [ADMIN LOGIN] Returning 200 response");
    return res.status(200).json({
      message: "Login successful",
      admin: adminData,
    });
  } catch (error) {
    console.error("❌ [ADMIN LOGIN] ERROR:", error);
    console.error("Stack:", error.stack);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
}
