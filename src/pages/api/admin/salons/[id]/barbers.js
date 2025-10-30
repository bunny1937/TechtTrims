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

    // Match both string AND ObjectId
    let query = { salonId: id };
    if (ObjectId.isValid(id)) {
      query = {
        $or: [{ salonId: id }, { salonId: new ObjectId(id) }],
      };
    }

    const barbers = await db.collection("barbers").find(query).toArray();

    console.log(`Found ${barbers.length} barbers for salon ${id}`);

    return res.status(200).json({ barbers });
  } catch (error) {
    console.error("Barbers API error:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
}
export default withAdminAuth(handler);
