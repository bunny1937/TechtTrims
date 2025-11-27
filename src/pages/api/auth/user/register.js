import clientPromise from "../../../../lib/mongodb";
import { hashPassword, generateToken } from "../../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { name, email, phone, gender, password, age, dateOfBirth, location } =
      req.body;

    // Validate required fields
    if (!name || !email || !phone || !gender || !password) {
      return res.status(400).json({
        message: "All fields are required",
        required: ["name", "email", "phone", "gender", "password"],
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate phone format (Indian format)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res
        .status(400)
        .json({ message: "Invalid phone number. Use 10-digit Indian format" });
    }

    // Validate password strength
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");
    const users = db.collection("users");

    // Check if user already exists
    const existingUser = await users.findOne({
      $or: [{ email: email.toLowerCase() }, { phone: phone }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists with this email or phone number",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    // Check for existing bookings by phone/name before creating user
    const existingBookings = await db
      .collection("bookings")
      .find({
        $or: [
          { customerPhone: phone },
          { customerName: { $regex: name, $options: "i" } },
        ],
      })
      .toArray();

    const newUser = {
      name,
      email,
      phone,
      gender,
      age: age || null,
      dateOfBirth: dateOfBirth || null,
      location: location || null,
      role: "user",
      hashedPassword,
      bookingHistory: [],
      preferences: {},
      resetPasswordToken: null,
      resetPasswordExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };
    const result = await db.collection("users").insertOne(newUser);

    // Update existing bookings with userId
    if (existingBookings.length > 0) {
      await db
        .collection("bookings")
        .updateMany(
          { _id: { $in: existingBookings.map((b) => b._id) } },
          { $set: { userId: result.insertedId } }
        );
    }

    // Generate JWT token
    const token = generateToken(result.insertedId, "user", email);

    // Remove password from response
    const { hashedPassword: _, ...userResponse } = newUser;
    userResponse.id = result.insertedId;

    // Ensure gender is in the response
    console.log("✅ User registered with gender:", userResponse.gender);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        ...userResponse,
        gender: userResponse.gender || "other", // Ensure gender is always present
      },
      token,
    });
  } catch (error) {
    console.error("User registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
