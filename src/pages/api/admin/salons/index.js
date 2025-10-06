import clientPromise from "../../../../lib/mongodb";
import { verifyAdminToken } from "../../../../lib/adminAuth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const admin = verifyAdminToken(req);
    if (!admin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get all salons with aggregated data
    const salons = await db
      .collection("salons")
      .aggregate([
        {
          $lookup: {
            from: "barbers",
            localField: "barbers",
            foreignField: "_id",
            as: "barberDetails",
          },
        },
        {
          $addFields: {
            barberCount: { $size: "$barberDetails" },
          },
        },
        {
          $project: {
            hashedPassword: 0,
            "ownerDetails.password": 0,
          },
        },
        { $sort: { createdAt: -1 } },
      ])
      .toArray();

    res.status(200).json({ salons });
  } catch (error) {
    console.error("Fetch salons error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
