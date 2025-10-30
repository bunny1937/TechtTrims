import clientPromise from "../../../../../lib/mongodb";
import { verifyAdminToken } from "../../../../../lib/adminAuth";
import { ObjectId } from "mongodb";
import { withAdminAuth } from "@/lib/middleware/withAdminAuth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.query;

  try {
    const client = await clientPromise;
    const db = client.db("techtrims");

    // Try to match both string AND ObjectId format
    let query = { salonId: id };

    // If id is valid ObjectId format, also try matching as ObjectId
    if (ObjectId.isValid(id)) {
      query = {
        $or: [
          { salonId: id }, // String
          { salonId: new ObjectId(id) }, // ObjectId
        ],
      };
    }

    const bookings = await db
      .collection("bookings")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    console.log(`Query:`, query);
    console.log(`Found ${bookings.length} bookings for salon ${id}`);

    return res.status(200).json({ bookings });
  } catch (error) {
    console.error("Bookings API error:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
}
export default withAdminAuth(handler);
