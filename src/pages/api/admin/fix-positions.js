import clientPromise from "../../../lib/mongodb";

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get all ORANGE bookings grouped by barberId
    const orangeBookings = await db
      .collection("bookings")
      .find({
        queueStatus: "ORANGE",
        isExpired: { $ne: true },
      })
      .toArray();

    // Group by barberId manually
    const barberGroups = {};
    orangeBookings.forEach((booking) => {
      const barberId = booking.barberId.toString();
      if (!barberGroups[barberId]) {
        barberGroups[barberId] = [];
      }
      barberGroups[barberId].push(booking);
    });

    let totalFixed = 0;

    // Update positions for each barber's bookings
    for (const barberId in barberGroups) {
      const bookings = barberGroups[barberId];

      // Sort by createdAt (earliest first)
      bookings.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      // Create bulk update operations
      const bulkOps = bookings.map((b, idx) => ({
        updateOne: {
          filter: { _id: b._id },
          update: { $set: { queuePosition: idx + 1 } },
        },
      }));

      if (bulkOps.length > 0) {
        await db.collection("bookings").bulkWrite(bulkOps);
        totalFixed += bulkOps.length;

        console.log(
          `✅ Fixed ${bulkOps.length} bookings for barber ${barberId}`
        );
        bookings.forEach((b, idx) => {
          console.log(`   ${idx + 1}. ${b.customerName} → Position ${idx + 1}`);
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Fixed ${totalFixed} bookings across ${
        Object.keys(barberGroups).length
      } barbers`,
      details: Object.keys(barberGroups).map((barberId) => ({
        barberId,
        count: barberGroups[barberId].length,
        customers: barberGroups[barberId].map((b) => b.customerName),
      })),
    });
  } catch (error) {
    console.error("Fix positions error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
