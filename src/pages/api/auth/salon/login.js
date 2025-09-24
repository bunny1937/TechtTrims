import { connectToDatabase } from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { db } = await connectToDatabase();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // Find salon
    const salon = await db.collection("salons").findOne({
      $or: [
        { email: email.toLowerCase() },
        { "ownerDetails.email": email },
        { "salonDetails.ownerEmail": email },
      ],
    });

    if (!salon) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Debug log to see your data structure
    console.log("Found salon:", JSON.stringify(salon, null, 2));

    // Check password - handle both hashed and plain text passwords
    // Check password - always use hashedPassword
    let isValidPassword = false;

    if (salon.hashedPassword) {
      isValidPassword = await bcrypt.compare(password, salon.hashedPassword);
    } else if (salon.password) {
      // Fallback in case old records stored plain password
      isValidPassword = password === salon.password;
    } else if (salon.ownerDetails?.password) {
      // If you had an old schema with ownerDetails.password
      isValidPassword = await bcrypt.compare(
        password,
        salon.ownerDetails.password
      );
    }

    // Generate token
    const token = jwt.sign(
      { salonId: salon._id, email: salon.email },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "30d" }
    );

    // Remove password from response
    const { password: _, ...salonData } = salon;

    res.status(200).json({
      success: true,
      message: "Login successful",
      salon: salonData,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
