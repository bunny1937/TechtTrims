// pages/api/auth/user-register.js
import { connectToDatabase } from "../../../lib/mongodb";
import { generateToken } from "../../../lib/auth";
import { validateMobile, validateEmail } from "../../../lib/validators";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, mobile, email, gender, location, bookingData } = req.body;

    // Basic validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Valid name is required" });
    }

    if (!validateMobile(mobile)) {
      return res.status(400).json({ error: "Valid mobile number is required" });
    }

    const { db } = await connectToDatabase();

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({
      $or: [{ mobile }, { email }],
    });

    if (existingUser) {
      // User exists, just return token
      const token = generateToken({
        id: existingUser._id,
        mobile: existingUser.mobile,
        role: "user",
      });

      return res.status(200).json({
        success: true,
        message: "Welcome back!",
        token,
        user: {
          id: existingUser._id,
          name: existingUser.name,
          mobile: existingUser.mobile,
        },
      });
    }

    // Create new user
    const userData = {
      name: name.trim(),
      mobile,
      email: email || null,
      gender: gender || "male",
      location: location || null,
      preferences: {
        favoriteServices: [],
        preferredPriceRange: { min: 0, max: 2000 },
      },
      bookingHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("users").insertOne(userData);

    // If there's booking data from service completion, associate it with user
    if (bookingData && bookingData.bookingId) {
      await db.collection("bookings").updateOne(
        { _id: new ObjectId(bookingData.bookingId) },
        {
          $set: {
            userId: result.insertedId,
            updatedAt: new Date(),
          },
        }
      );

      // Add booking to user's history
      await db.collection("users").updateOne(
        { _id: result.insertedId },
        {
          $push: { bookingHistory: bookingData.bookingId },
        }
      );
    }

    const token = generateToken({
      id: result.insertedId,
      mobile,
      role: "user",
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully!",
      token,
      user: {
        id: result.insertedId,
        name,
        mobile,
      },
    });
  } catch (error) {
    console.error("User registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
