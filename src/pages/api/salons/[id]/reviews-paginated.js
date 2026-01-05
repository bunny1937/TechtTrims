import { connectToDatabase } from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const filter = req.query.filter || "all";
    const sortBy = req.query.sort || "recent";

    const { db } = await connectToDatabase();

    // Build filter query
    let ratingFilter = {};
    if (filter === "positive")
      ratingFilter = { "feedback.ratings.overall": { $gte: 4 } };
    if (filter === "medium")
      ratingFilter = { "feedback.ratings.overall": { $gte: 3, $lt: 4 } };
    if (filter === "critical")
      ratingFilter = { "feedback.ratings.overall": { $lt: 3 } };

    // Build sort query
    const sortQuery =
      sortBy === "recent"
        ? { "feedback.submittedAt": -1 }
        : { "feedback.ratings.overall": -1 };

    // Get total count
    const totalReviews = await db.collection("bookings").countDocuments({
      salonId: new ObjectId(id),
      "feedback.submitted": true,
      ...ratingFilter,
    });

    // Fetch paginated reviews
    const reviews = await db
      .collection("bookings")
      .find({
        salonId: new ObjectId(id),
        "feedback.submitted": true,
        ...ratingFilter,
      })
      .sort(sortQuery)
      .skip((page - 1) * limit)
      .limit(limit)
      .project({
        customerName: 1,
        service: 1,
        "feedback.ratings": 1,
        "feedback.comment": 1,
        "feedback.submittedAt": 1,
        "feedback.serviceDate": 1,
      })
      .toArray();

    // Calculate stats (cache this for 5 min)
    const stats = await db
      .collection("bookings")
      .aggregate([
        {
          $match: {
            salonId: new ObjectId(salonId),
            "feedback.submitted": true,
          },
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$feedback.ratings.overall" },
            totalReviews: { $sum: 1 },
            positiveCount: {
              $sum: {
                $cond: [{ $gte: ["$feedback.ratings.overall", 4] }, 1, 0],
              },
            },
            mediumCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$feedback.ratings.overall", 3] },
                      { $lt: ["$feedback.ratings.overall", 4] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            criticalCount: {
              $sum: {
                $cond: [{ $lt: ["$feedback.ratings.overall", 3] }, 1, 0],
              },
            },
          },
        },
      ])
      .toArray();

    return res.status(200).json({
      reviews: reviews.map((r) => ({
        id: r._id,
        customerName: r.customerName,
        service: r.service,
        rating: r.feedback.ratings.overall,
        ratings: r.feedback.ratings,
        comment: r.feedback.comment,
        submittedAt: r.feedback.submittedAt,
        serviceDate: r.feedback.serviceDate,
      })),
      stats: stats[0] || { avgRating: 0, totalReviews: 0 },
      totalPages: Math.ceil(totalReviews / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Reviews pagination error:", error);
    return res.status(500).json({ error: "Failed to fetch reviews" });
  }
}
