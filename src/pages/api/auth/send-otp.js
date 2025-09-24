// pages/api/auth/send-otp.js
// Generates a 6-digit OTP and stores in 'otps' collection (expires in 5 minutes).
// NOTE: No SMS provider integrated. Replace sendSms() with your provider.
import { connectToDatabase } from "../../../lib/mongodb";
import { nanoid } from "nanoid";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  try {
    const { mobile } = req.body || {};
    if (!mobile) return res.status(400).json({ message: "Missing mobile" });
    const { db } = await connectToDatabase();
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
    await db.collection("otps").updateOne({ mobile }, { $set: { otp, expiresAt } }, { upsert: true });
    // TODO: Integrate SMS provider here. For now we return OTP in response for testing.
    return res.status(200).json({ message: "OTP sent (dev)", otp });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: e.message });
  }
}