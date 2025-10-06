import clientPromise from "../../../../lib/mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Find admin
    const admin = await db.collection("admins").findOne({ username });

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, admin.hashedPassword);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign(
      { adminId: admin._id, username: admin.username, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Remove password from response
    const { hashedPassword, ...adminData } = admin;

    res.status(200).json({
      message: "Login successful",
      token,
      admin: adminData,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
