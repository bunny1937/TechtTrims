import clientPromise from "../../../lib/mongodb";
import { hashPassword } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { userType, ...userData } = req.body;

  try {
    const client = await clientPromise;
    const db = client.db("techtrims");

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Determine collection based on user type
    const collection = userType === "owner" ? "salons" : "users";

    // Check if user already exists
    const existingUser = await db.collection(collection).findOne({
      $or: [{ email: userData.email }, { mobile: userData.mobile }],
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user
    const newUser = {
      ...userData,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add default fields for salon owners
    if (userType === "owner") {
      newUser.rating = 0;
      newUser.totalBookings = 0;
      newUser.customerServiceScore = 0;
      newUser.services = [];
      newUser.staff = [];
      newUser.achievements = [];
      newUser.metrics = {
        avgWaitingTime: 0,
        cleanliness: 0,
        staffPoliteness: 0,
      };
    }

    const result = await db.collection(collection).insertOne(newUser);

    // Create token

    res.status(201).json({
      message: "Registration successful",
      token,
      userType,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
