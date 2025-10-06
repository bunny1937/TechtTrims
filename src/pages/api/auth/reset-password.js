import clientPromise from "../../../lib/mongodb";
import { verifyResetToken } from "../../../lib/resetToken";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }

    // ✅ VALIDATE PASSWORD STRENGTH
    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      return res.status(400).json({
        message: "Password must contain uppercase, lowercase, and numbers",
      });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");
    const users = db.collection("users");

    // First, get user to verify token
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.userId) {
      return res.status(400).json({ message: "Invalid token format" });
    }

    const user = await users.findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ VERIFY JWT TOKEN with current password hash
    const verification = verifyResetToken(token, user.hashedPassword);

    if (!verification.valid) {
      return res.status(400).json({ message: verification.error });
    }

    // ✅ HASH NEW PASSWORD (never store plaintext)
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // ✅ UPDATE PASSWORD
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          hashedPassword,
          updatedAt: new Date(),
        },
      }
    );

    console.log("✅ Password reset successful:", {
      userId: user._id.toString(),
      email: user.email,
    });

    return res.status(200).json({
      message:
        "Password reset successfully! You can now login with your new password.",
      success: true,
    });
  } catch (error) {
    console.error("❌ Reset password error:", error.message);
    // ✅ NEVER expose internal errors
    return res.status(500).json({
      message: "An error occurred while resetting password. Please try again.",
    });
  }
}
