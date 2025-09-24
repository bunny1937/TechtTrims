// pages/api/auth/salon-login.js
import { connectToDatabase } from "../../../lib/mongodb";
import { generateToken } from "../../../lib/auth";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { db } = await connectToDatabase();

    const salon = await db.collection("salons").findOne({
      "ownerDetails.email": email,
    });

    if (!salon) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = awaitomparePassword(
      password,
      salon.ownerDetails.password
    );
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!salon.isActive) {
      return res.status(403).json({ error: "Salon account is deactivated" });
    }

    const token = generateToken({
      id: salon._id,
      email: salon.ownerDetails.email,
      role: "salon_owner",
    });

    res.status(200).json({
      success: true,
      token,
      salon: {
        id: salon._id,
        name: salon.salonDetails.name,
        email: salon.ownerDetails.email,
        address: salon.salonDetails.address,
      },
    });
  } catch (error) {
    console.error("Salon login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
