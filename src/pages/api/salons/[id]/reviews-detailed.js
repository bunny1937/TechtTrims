import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.query;

  try {
    const client = await clientPromise;
    const db = client.db("techtrims");

    console.log("Fetching reviews for salon:", id);

    // Build query to match BOTH string and ObjectId format
    let salonQuery = { salonId: id };

    if (ObjectId.isValid(id)) {
      salonQuery = {
        $or: [
          { salonId: id }, // String format
          { salonId: new ObjectId(id) }, // ObjectId format
        ],
      };
    }

    // Get all bookings with feedback
    const reviews = await db
      .collection("bookings")
      .find({
        ...salonQuery,
        "feedback.submitted": true,
      })
      .sort({ "feedback.submittedAt": -1 })
      .toArray();

    console.log("Found reviews:", reviews.length);

    // Format reviews
    const formattedReviews = reviews.map((booking) => ({
      id: booking._id,
      customerName: booking.customerName,
      rating: booking.feedback.ratings.overall,
      ratings: {
        serviceQuality: booking.feedback.ratings.serviceQuality,
        timing: booking.feedback.ratings.timing,
        ambience: booking.feedback.ratings.ambience,
        cleanliness: booking.feedback.ratings.cleanliness,
      },
      comment: booking.feedback.comment || "",
      service: booking.service,
      serviceDate:
        booking.feedback.serviceDate ||
        booking.serviceStartedAt ||
        booking.completedAt ||
        booking.date ||
        booking.createdAt, // ✅ FIX THIS
      submittedAt: booking.feedback.submittedAt,
    }));

    // Calculate statistics
    const totalReviews = formattedReviews.length;

    if (totalReviews === 0) {
      return res.status(200).json({
        reviews: [],
        stats: {
          totalReviews: 0,
          averageRating: 0,
          positiveCount: 0,
          mediumCount: 0,
          criticalCount: 0,
          positivePercentage: 0,
          mediumPercentage: 0,
          criticalPercentage: 0,
        },
      });
    }

    const averageRating =
      formattedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    const positiveCount = formattedReviews.filter((r) => r.rating >= 4).length;
    const mediumCount = formattedReviews.filter(
      (r) => r.rating >= 3 && r.rating < 4
    ).length;
    const criticalCount = formattedReviews.filter((r) => r.rating < 3).length;

    const stats = {
      totalReviews,
      averageRating: parseFloat(averageRating.toFixed(1)),
      positiveCount,
      mediumCount,
      criticalCount,
      positivePercentage: Math.round((positiveCount / totalReviews) * 100),
      mediumPercentage: Math.round((mediumCount / totalReviews) * 100),
      criticalPercentage: Math.round((criticalCount / totalReviews) * 100),
    };

    console.log("Stats:", stats);

    return res.status(200).json({ reviews: formattedReviews, stats });
  } catch (error) {
    console.error("Reviews detailed API error:", error.message);
    console.error("Stack:", error.stack);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
