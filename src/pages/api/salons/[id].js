// pages/api/salons/[id].js
import { connectToDatabase } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  const { id } = req.query;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid salon ID" });
  }

  try {
    const { db } = await connectToDatabase();

    if (req.method === "GET") {
      const salon = await db
        .collection("salons")
        .findOne(
          { _id: new ObjectId(id) },
          { projection: { "ownerDetails.password": 0 } }
        );

      if (!salon) {
        return res.status(404).json({ error: "Salon not found" });
      }

      // Get recent reviews/feedback
      const recentFeedback = await db
        .collection("bookings")
        .find({
          salonId: id,
          "feedback.submitted": true,
        })
        .sort({ updatedAt: -1 })
        .limit(5)
        .toArray();

      res.status(200).json({
        success: true,
        salon: {
          ...salon,
          recentFeedback: recentFeedback.map((booking) => ({
            userName: booking.userDetails.name,
            rating: booking.feedback.ratings.overall,
            comment: booking.feedback.comment,
            service: booking.service.name,
            date: booking.updatedAt,
          })),
        },
      });
    } else if (req.method === "PUT") {
      // Update salon details (protected route - needs authentication)
      const updateData = {
        ...req.body,
        updatedAt: new Date(),
      };

      const result = await db
        .collection("salons")
        .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Salon not found" });
      }

      res.status(200).json({
        success: true,
        message: "Salon updated successfully",
      });
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Salon API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
