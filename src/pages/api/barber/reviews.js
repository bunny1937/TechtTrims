// src/pages/api/barber/reviews.js
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { barberId } = req.query;

    if (!barberId) {
      return res.status(400).json({ message: "Barber ID required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get all completed bookings with feedback for this barber
    const reviews = await db
      .collection("bookings")
      .find({
        barberId: new ObjectId(barberId),
        status: "completed",
        "feedback.submitted": true,
      })
      .sort({ updatedAt: -1 })
      .toArray();

    // Format reviews
    const formattedReviews = reviews.map((booking) => ({
      id: booking._id,
      customerName: booking.customerName || "Anonymous",
      service: booking.service,
      date: booking.date || booking.createdAt,
      rating: booking.feedback?.ratings?.overall || 0,
      barberRating: booking.feedback?.ratings?.barberPerformance || 0,
      comment: booking.feedback?.comment || "",
      submittedAt: booking.feedback?.submittedAt || booking.updatedAt,
    }));

    // Calculate average rating
    const totalRatings = formattedReviews.reduce(
      (sum, r) => sum + (r.barberRating || r.rating),
      0,
    );
    const avgRating =
      formattedReviews.length > 0
        ? (totalRatings / formattedReviews.length).toFixed(1)
        : 0;

    return res.status(200).json({
      success: true,
      reviews: formattedReviews,
      totalReviews: formattedReviews.length,
      avgRating: parseFloat(avgRating),
    });
  } catch (error) {
    console.error("Fetch reviews error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
