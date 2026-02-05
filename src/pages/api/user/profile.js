import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { withAuth } from "../../../lib/middleware/withAuth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // ✅ Add cache headers - profile changes rarely
    res.setHeader(
      "Cache-Control",
      "private, s-maxage=30, stale-while-revalidate=60",
    );

    // req.user is already set by withAuth middleware
    const { userId } = req.user;

    const client = await clientPromise;
    const db = client.db("techtrims");

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          hashedPassword: 0,
          resetToken: 0,
          otp: 0,
          verificationToken: 0,
        },
        maxTimeMS: 2000,
      },
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return complete user profile
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
      isPhoneVerified: user.isPhoneVerified || true,
    };

    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Profile API error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ✅ Wrap with authentication middleware
export default withAuth(handler);
