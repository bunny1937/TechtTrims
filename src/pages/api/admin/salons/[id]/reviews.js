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
    let salonQuery = { salonId: id };
    if (ObjectId.isValid(id)) {
      salonQuery = {
        $or: [{ salonId: id }, { salonId: new ObjectId(id) }],
      };
    }

    const reviews = await db
      .collection("bookings")
      .find({
        ...salonQuery,
        "feedback.submitted": true,
      })
      .sort({ "feedback.submittedAt": -1 })
      .limit(20)
      .toArray();

    const formattedReviews = reviews.map((booking) => ({
      _id: booking._id,
      customerName: booking.customerName,
      rating: booking.feedback?.ratings?.overall || 5,
      comment: booking.feedback?.comment || "No comment",
      service: booking.service,
      submittedAt: booking.feedback?.submittedAt,
    }));

    console.log(`Found ${formattedReviews.length} reviews for salon ${id}`);

    return res.status(200).json({ reviews: formattedReviews });
  } catch (error) {
    console.error("Reviews API error:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
}
export default withAdminAuth(handler);
