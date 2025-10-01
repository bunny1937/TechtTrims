import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";

// Update salon stats in real-time
export async function updateSalonStats(salonId) {
  try {
    const client = await clientPromise;
    const db = client.db("techtrims");

    const salonObjectId =
      typeof salonId === "string" ? new ObjectId(salonId) : salonId;
    const salonIdStr = salonObjectId.toString();

    // Get all bookings for this salon
    const allBookings = await db
      .collection("bookings")
      .find({
        salonId: { $in: [salonIdStr, salonObjectId] },
      })
      .toArray();

    const completed = allBookings.filter((b) => b.status === "completed");

    // Calculate repeat customers
    const userBookings = {};
    completed.forEach((b) => {
      if (b.userId) {
        const userId =
          typeof b.userId === "string" ? b.userId : b.userId.toString();
        userBookings[userId] = (userBookings[userId] || 0) + 1;
      }
    });
    const repeatCustomers = Object.values(userBookings).filter(
      (count) => count > 1
    ).length;

    // Calculate average wait time
    const waitTimes = completed
      .filter((b) => b.completedAt && b.createdAt)
      .map((b) => {
        const created = new Date(b.createdAt);
        const completedTime = new Date(b.completedAt);
        return (completedTime - created) / (1000 * 60); // minutes
      });
    const averageWaitTime =
      waitTimes.length > 0
        ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
        : 0;

    // Update salon
    await db.collection("salons").updateOne(
      { _id: salonObjectId },
      {
        $set: {
          "stats.totalBookings": allBookings.length,
          "stats.completedBookings": completed.length,
          "stats.repeatCustomers": repeatCustomers,
          "stats.averageWaitTime": averageWaitTime,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`✅ Updated stats for salon ${salonIdStr}`);
    return true;
  } catch (error) {
    console.error("Error updating salon stats:", error);
    return false;
  }
}

// Update salon ratings in real-time
export async function updateSalonRatings(salonId) {
  try {
    const client = await clientPromise;
    const db = client.db("techtrims");

    const salonObjectId =
      typeof salonId === "string" ? new ObjectId(salonId) : salonId;
    const salonIdStr = salonObjectId.toString();

    // Get all feedback bookings
    const feedbackBookings = await db
      .collection("bookings")
      .find({
        salonId: { $in: [salonIdStr, salonObjectId] },
        "feedback.submitted": true,
      })
      .toArray();

    const ratings = {
      overall: 0,
      serviceQuality: 0,
      timing: 0,
      ambience: 0,
      cleanliness: 0,
      totalReviews: feedbackBookings.length,
    };

    if (feedbackBookings.length > 0) {
      [
        "overall",
        "serviceQuality",
        "timing",
        "ambience",
        "cleanliness",
      ].forEach((key) => {
        const sum = feedbackBookings.reduce(
          (acc, b) => acc + (b.feedback.ratings?.[key] || 0),
          0
        );
        ratings[key] = parseFloat((sum / feedbackBookings.length).toFixed(1));
      });
    }

    await db.collection("salons").updateOne(
      { _id: salonObjectId },
      {
        $set: {
          ratings: ratings,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`✅ Updated ratings for salon ${salonIdStr}`);
    return true;
  } catch (error) {
    console.error("Error updating salon ratings:", error);
    return false;
  }
}

// Update barber stats in real-time
export async function updateBarberStats(barberId, barberName, salonId) {
  try {
    const client = await clientPromise;
    const db = client.db("techtrims");

    const barberObjectId =
      typeof barberId === "string" ? new ObjectId(barberId) : barberId;

    // Get all completed bookings for this barber
    const barberBookings = await db
      .collection("bookings")
      .find({
        barber: barberName,
        status: "completed",
      })
      .toArray();

    const totalBookings = barberBookings.length;
    const earnings = barberBookings.reduce((sum, b) => sum + (b.price || 0), 0);

    const ratingsData = barberBookings
      .filter(
        (b) => b.feedback?.submitted && b.feedback.ratings?.barberPerformance
      )
      .map((b) => b.feedback.ratings.barberPerformance);

    const rating =
      ratingsData.length > 0
        ? parseFloat(
            (
              ratingsData.reduce((a, b) => a + b, 0) / ratingsData.length
            ).toFixed(1)
          )
        : 5.0;

    await db.collection("barbers").updateOne(
      { _id: barberObjectId },
      {
        $set: {
          totalBookings,
          earnings,
          rating,
          updatedAt: new Date(),
        },
      }
    );

    console.log(
      `✅ Updated stats for barber ${barberName}: ${totalBookings} bookings, ₹${earnings}`
    );
    return true;
  } catch (error) {
    console.error("Error updating barber stats:", error);
    return false;
  }
}
