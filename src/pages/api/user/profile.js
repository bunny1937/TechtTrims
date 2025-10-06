import clientPromise from "../../../lib/mongodb";
import { verifyToken } from "../../../lib/auth";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const user = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(decoded.userId) },
        { projection: { hashedPassword: 0 } }
      );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return complete user profile with all new fields
    const userProfile = {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      phoneNumber: user.phoneNumber || user.phone,
      mobile: user.mobile || user.phone || user.phoneNumber,
      gender: user.gender,
      age: user.age || null,
      dateOfBirth: user.dateOfBirth || null,
      location: user.location || null,
      role: user.role || "user",
      bookingHistory: user.bookingHistory || [],
      preferences: user.preferences || {},
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isActive: user.isActive,
      // Keep backward compatibility
      isPhoneVerified: user.isPhoneVerified || true,
    };

    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Profile API error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
