import crypto from "crypto";
import clientPromise from "../mongodb";

const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5; // Max 5 wrong attempts
const MAX_RESENDS = 3; // Max 3 OTP resends per hour
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 min lockout after max attempts

// Optional: hash OTP before storing (prevents DB leak from exposing real OTP)
function hashOTP(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function generateOTP(email) {
  const client = await clientPromise;
  const db = client.db("techtrims");

  const existing = await db.collection("otps").findOne({ email });
  const now = new Date();

  // Locked out?
  if (existing && existing.lockedUntil && now < existing.lockedUntil) {
    const remainingMinutes = Math.ceil((existing.lockedUntil - now) / 60000);
    throw new Error(
      `Too many attempts. Try again in ${remainingMinutes} minutes.`
    );
  }

  // Resend limit (per hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (
    existing &&
    existing.resendCount >= MAX_RESENDS &&
    existing.lastResendAt &&
    existing.lastResendAt > oneHourAgo
  ) {
    throw new Error("Maximum OTP requests reached. Please try again later.");
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY);

  const resendCount =
    existing && existing.lastResendAt && existing.lastResendAt > oneHourAgo
      ? (existing.resendCount || 0) + 1
      : 1;

  const hashedOtp = hashOTP(otp);

  await db.collection("otps").updateOne(
    { email },
    {
      $set: {
        otp: hashedOtp,
        expiresAt,
        attempts: 0,
        resendCount,
        lastResendAt: now,
        lockedUntil: null,
        createdAt: now,
      },
    },
    { upsert: true }
  );

  if (process.env.NODE_ENV === "development") {
    console.log(`[OTP Generated] ${email}: ${otp} (Resend #${resendCount})`);
  } else {
    console.log(`[OTP Generated] ${email}: ****** (Resend #${resendCount})`);
  }

  return otp;
}

export async function verifyOTP(email, inputOTP) {
  const client = await clientPromise;
  const db = client.db("techtrims");

  const stored = await db.collection("otps").findOne({ email });

  if (!stored) {
    return { success: false, message: "OTP expired or not found" };
  }

  const now = new Date();

  // Locked out?
  if (stored.lockedUntil && now < stored.lockedUntil) {
    const remainingMinutes = Math.ceil((stored.lockedUntil - now) / 60000);
    return {
      success: false,
      message: `Too many failed attempts. Try again in ${remainingMinutes} minutes.`,
    };
  }

  // Expired?
  if (now > stored.expiresAt) {
    await db.collection("otps").deleteOne({ email });
    return {
      success: false,
      message: "OTP expired. Please request a new one.",
    };
  }

  // Max attempts?
  if (stored.attempts >= MAX_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_TIME);
    await db
      .collection("otps")
      .updateOne({ email }, { $set: { lockedUntil, attempts: MAX_ATTEMPTS } });

    return {
      success: false,
      message: "Too many failed attempts. Account locked for 15 minutes.",
    };
  }

  // Verify
  const hashedInput = hashOTP(inputOTP);
  if (stored.otp !== hashedInput) {
    await db.collection("otps").updateOne({ email }, { $inc: { attempts: 1 } });

    return {
      success: false,
      message: "Invalid OTP. Please try again.",
      attemptsLeft: MAX_ATTEMPTS - stored.attempts - 1,
    };
  }

  // Success: delete record
  await db.collection("otps").deleteOne({ email });

  return { success: true, message: "OTP verified successfully!" };
}
