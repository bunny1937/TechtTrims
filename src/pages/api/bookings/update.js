// pages/api/bookings/update.js
import { connectToDatabase } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { bookingId, status, feedback } = req.body;

    if (!ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const { db } = await connectToDatabase();

    const updateData = { updatedAt: new Date() };

    if (status) {
      updateData.status = status;
    }

    if (feedback) {
      updateData.feedback = {
        submitted: true,
        ...feedback,
        submittedAt: new Date(),
      };
    }

    const result = await db
      .collection("bookings")
      .updateOne({ _id: new ObjectId(bookingId) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // If feedback is submitted, update salon ratings
    if (feedback && feedback.ratings) {
      const booking = await db.collection("bookings").findOne({
        _id: new ObjectId(bookingId),
      });

      if (booking) {
        await updateSalonRatings(db, booking.salonId, feedback.ratings);
      }
    }
    if (feedback?.submitted) {
      updateData.feedback = {
        submitted: true,
        ...feedback,
        submittedAt: new Date(),
      };
    }

    const updatedBooking = await db.collection("bookings").findOne({
      _id: new ObjectId(bookingId),
    });

    // ✅ UPDATE SALON RATINGS IN REAL-TIME
    if (feedback?.submitted && updatedBooking?.salonId) {
      await updateSalonRatings(updatedBooking.salonId);

      // ✅ UPDATE BARBER STATS IF BARBER WAS RATED
      if (feedback.ratings?.barberPerformance && updatedBooking.barber) {
        const barber = await db.collection("barbers").findOne({
          name: updatedBooking.barber,
        });
        if (barber) {
          await updateBarberStats(
            barber._id,
            barber.name,
            updatedBooking.salonId
          );
        }
      }
    }
    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
    });
  } catch (error) {
    console.error("Booking update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Helper function to update salon ratings
async function updateSalonRatings(db, salonId, newRatings) {
  try {
    // Get all feedback for this salon
    const allFeedback = await db
      .collection("bookings")
      .find({
        salonId,
        "feedback.submitted": true,
      })
      .toArray();

    if (allFeedback.length === 0) return;

    // Calculate average ratings
    const totalRatings = allFeedback.reduce((acc, booking) => {
      const ratings = booking.feedback.ratings;
      Object.keys(ratings).forEach((key) => {
        acc[key] = (acc[key] || 0) + ratings[key];
      });
      return acc;
    }, {});

    const avgRatings = {};
    Object.keys(totalRatings).forEach((key) => {
      avgRatings[key] = parseFloat(
        (totalRatings[key] / allFeedback.length).toFixed(1)
      );
    });

    // Update salon ratings
    await db.collection("salons").updateOne(
      { _id: new ObjectId(salonId) },
      {
        $set: {
          "ratings.overall": avgRatings.overall || 5.0,
          "ratings.serviceQuality": avgRatings.serviceQuality || 5.0,
          "ratings.timing": avgRatings.timing || 5.0,
          "ratings.cleanliness": avgRatings.cleanliness || 5.0,
          "ratings.ambience": avgRatings.ambience || 5.0,
          "ratings.totalReviews": allFeedback.length,
          updatedAt: new Date(),
        },
      }
    );
  } catch (error) {
    console.error("Error updating salon ratings:", error);
  }
}
