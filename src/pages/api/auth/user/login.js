import clientPromise from "../../../../lib/mongodb";
import { verifyPassword, generateToken } from "../../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { emailOrPhone, password } = req.body;

    // Validate required fields
    if (!emailOrPhone || !password) {
      return res.status(400).json({
        message: "Email/Phone and password are required",
      });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");
    const users = db.collection("users");

    // Find user by email or phone
    const user = await users.findOne({
      $or: [{ email: emailOrPhone.toLowerCase() }, { phone: emailOrPhone }],
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        message: "Account has been deactivated. Please contact support.",
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.hashedPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Update last login
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    // Generate JWT token
    const token = generateToken(user._id, user.role, user.email);

    // Remove sensitive data from response
    const { hashedPassword, ...userResponse } = user;

    res.status(200).json({
      message: "Login successful",
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error("User login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
