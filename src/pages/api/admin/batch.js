import { connectToDatabase } from "../../../lib/mongodb";
import { withAdminAuth } from "../../../lib/middleware/withAdminAuth";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { queries } = req.body; // Array of query objects

    if (!Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ error: "queries array required" });
    }

    const { db } = await connectToDatabase();
    const results = {};

    // ✅ Execute all queries in parallel
    await Promise.all(
      queries.map(async (query) => {
        const { id, type, params } = query;

        try {
          switch (type) {
            case "salons":
              results[id] = await db
                .collection("salons")
                .find({})
                .limit(params?.limit || 50)
                .toArray();
              break;

            case "stats":
              results[id] = await db
                .collection("bookings")
                .aggregate([
                  {
                    $group: {
                      _id: null,
                      totalBookings: { $sum: 1 },
                      totalRevenue: { $sum: "$price" },
                    },
                  },
                ])
                .toArray();
              break;
            // ✅ pages/api/admin/batch.js - ADD recentBookings case
            case "recentBookings":
              results[id] = await db
                .collection("bookings")
                .find({})
                .sort({ createdAt: -1 })
                .limit(params?.limit || 10)
                .project({
                  _id: 1,
                  customerName: 1,
                  service: 1,
                  createdAt: 1,
                })
                .toArray();
              break;

            case "analytics":
              results[id] = await db
                .collection("bookings")
                .aggregate([
                  {
                    $group: {
                      _id: { $hour: "$createdAt" },
                      count: { $sum: 1 },
                    },
                  },
                  { $sort: { count: -1 } },
                  { $limit: 10 },
                ])
                .toArray();
              break;

            default:
              results[id] = { error: "Unknown query type" };
          }
        } catch (error) {
          results[id] = { error: error.message };
        }
      })
    );

    return res.status(200).json({ results });
  } catch (error) {
    console.error("Batch API error:", error);
    return res.status(500).json({ error: "Batch request failed" });
  }
}

export default withAdminAuth(handler);
