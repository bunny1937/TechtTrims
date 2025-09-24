// pages/api/auth/verify-otp.js
// Verifies OTP and returns a temporary token (or creates/returns user).
// For demo returns user info if found or indicates success.
import { connectToDatabase } from "../../../lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  try {
    const { mobile, otp } = req.body || {};
    if (!mobile || !otp) return res.status(400).json({ message: "Missing fields" });
    const { db } = await connectToDatabase();
    const record = await db.collection("otps").findOne({ mobile });
    if (!record) return res.status(400).json({ message: "No OTP found" });
    if (new Date(record.expiresAt) < new Date()) return res.status(400).json({ message: "OTP expired" });
    if (String(record.otp) !== String(otp)) return res.status(400).json({ message: "Invalid OTP" });
    // OTP ok — optionally find/create user
    const user = await db.collection("users").findOne({ mobile });
    // delete OTP after use
    await db.collection("otps").deleteOne({ mobile });
    return res.status(200).json({ message: "Verified", user: user || null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: e.message });
  }
}