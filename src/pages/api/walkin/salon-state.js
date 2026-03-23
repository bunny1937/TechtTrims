import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { salonId } = req.query;

    if (!salonId) {
      return res.status(400).json({ message: "salonId is required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    let salonObjectId;
    try {
      salonObjectId = new ObjectId(salonId);
    } catch {
      return res.status(400).json({ message: "Invalid salonId" });
    }

    const now = new Date();

    // Expire stale RED bookings
    await db.collection("bookings").updateMany(
      {
        salonId: salonObjectId,
        queueStatus: "RED",
        expiresAt: { $lt: now },
        isExpired: false,
      },
      { $set: { isExpired: true, queueStatus: "EXPIRED" } },
    );

    // Get all barbers
    const barbers = await db
      .collection("barbers")
      .find({ salonId: salonObjectId })
      .toArray();

    // Get all dummy (offline) users for this salon — exclude completed/cancelled
    const allDummies = await db
      .collection("dummyusers")
      .find({
        salonId: salonObjectId,
        status: { $nin: ["completed", "cancelled"] },
      })
      .sort({ arrivedAt: 1 })
      .toArray();

    const WAITING_STATUSES = ["active", "claimed"];

    // Build barber states
    const barberStates = await Promise.all(
      barbers.map(async (barber) => {
        let timeLeft = 0;
        let currentCustomer = null;

        if (
          barber.currentStatus === "OCCUPIED" &&
          barber.currentServiceEndTime
        ) {
          const endTime = new Date(barber.currentServiceEndTime);
          timeLeft = Math.max(0, Math.ceil((endTime - now) / 1000 / 60));
          currentCustomer = barber.currentCustomerName || null;
        }

        // Online queue count (ORANGE) for this barber
        const onlineQueueCount = await db
          .collection("bookings")
          .countDocuments({
            barberId: barber._id,
            queueStatus: "ORANGE",
            isExpired: { $ne: true },
          });

        // Offline (dummy) count for this barber by name
        const matchDummy = (d) =>
          (d.barberId && d.barberId.toString() === barber._id.toString()) ||
          d.barberName?.toLowerCase().trim() ===
            barber.name?.toLowerCase().trim();

        const offlineCount = allDummies.filter(
          (d) => matchDummy(d) && d.status !== "in-service",
        ).length;

        const hasDummyServing = allDummies.some(
          (d) => matchDummy(d) && d.status === "in-service",
        );
        const hasDummyWaiting = allDummies.some(
          (d) => matchDummy(d) && WAITING_STATUSES.includes(d.status),
        );

        const effectiveStatus =
          hasDummyServing || barber.currentStatus === "OCCUPIED"
            ? "OCCUPIED"
            : hasDummyWaiting || onlineQueueCount > 0
              ? "HAS_QUEUE"
              : "AVAILABLE";

        let effectiveTimeLeft = timeLeft;
        if (hasDummyServing && !timeLeft) {
          const servingDummy = allDummies.find(
            (d) => matchDummy(d) && d.status === "in-service",
          );
          if (servingDummy) {
            const startedAt = servingDummy.serviceStartedAt
              ? new Date(servingDummy.serviceStartedAt)
              : null;
            const totalMins = Number(servingDummy.serviceTime) || 30;
            if (startedAt) {
              const elapsedMins = Math.floor((now - startedAt) / 1000 / 60);
              effectiveTimeLeft = Math.max(0, totalMins - elapsedMins);
            } else {
              effectiveTimeLeft = totalMins;
            }
          }
        }

        // Only sum dummies still waiting (active), not the one already in-service
        const offlineWaitMins = allDummies
          .filter((d) => matchDummy(d) && WAITING_STATUSES.includes(d.status))
          .reduce((sum, d) => sum + (Number(d.serviceTime) || 30) + 5, 0);
        return {
          barberId: barber._id.toString(),
          name: barber.name,
          chairNumber: barber.chairNumber || 1,
          status: effectiveStatus,
          timeLeft: effectiveTimeLeft,
          queueCount: onlineQueueCount + offlineCount,
          offlineCount,
          offlineWaitMins,
          currentCustomer,
          isPaused: barber.isPaused || false,
        };
      }),
    );

    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const redCount = await db.collection("bookings").countDocuments({
      salonId: salonObjectId,
      $or: [
        {
          bookingType: { $ne: "PREBOOK" },
          queueStatus: "RED",
          isExpired: false,
          expiresAt: { $gt: now },
        },
        {
          bookingType: "PREBOOK",
          scheduledFor: { $lte: oneHourFromNow },
          queueStatus: { $in: ["PREBOOK_PENDING", "RED"] },
          status: { $ne: "cancelled" },
        },
      ],
    });

    const orangeCount = await db.collection("bookings").countDocuments({
      salonId: salonObjectId,
      queueStatus: "ORANGE",
      isExpired: false,
      arrivedAt: { $exists: true },
    });

    const greenCount = await db.collection("bookings").countDocuments({
      salonId: salonObjectId,
      queueStatus: "GREEN",
      isExpired: false,
      serviceStartedAt: { $exists: true },
    });

    // Average wait time
    const servingBookings = await db
      .collection("bookings")
      .find({
        salonId: salonObjectId,
        queueStatus: "GREEN",
        isExpired: { $ne: true },
      })
      .toArray();

    let totalTimeLeft = 0;
    servingBookings.forEach((b) => {
      if (b.expectedCompletionTime) {
        totalTimeLeft += Math.max(
          0,
          Math.ceil((new Date(b.expectedCompletionTime) - now) / 1000 / 60),
        );
      }
    });

    // Time remaining for dummy in-service (not full serviceTime)
    const dummyInServiceTimeLeft = allDummies
      .filter((d) => d.status === "in-service")
      .reduce((sum, d) => {
        const startedAt = d.serviceStartedAt
          ? new Date(d.serviceStartedAt)
          : null;
        const totalMins = Number(d.serviceTime) || 30;
        if (startedAt) {
          const elapsedMins = Math.floor((now - startedAt) / 1000 / 60);
          return sum + Math.max(0, totalMins - elapsedMins);
        }
        return sum + totalMins;
      }, 0);

    const dummyWaitingTime = allDummies
      .filter((d) => WAITING_STATUSES.includes(d.status))
      .reduce((sum, d) => sum + (Number(d.serviceTime) || 30) + 5, 0);

    // avgWaitTime = time left for current service + all waiting customers' times
    const hasAnyone = greenCount > 0 || dummyInServiceTimeLeft > 0;
    const avgWaitTime = hasAnyone
      ? totalTimeLeft +
        dummyInServiceTimeLeft +
        dummyWaitingTime +
        orangeCount * 35
      : dummyWaitingTime + orangeCount * 35;

    const salon = await db
      .collection("salons")
      .findOne({ _id: salonObjectId }, { projection: { name: 1 } });

    const dummyServingCount = allDummies.filter(
      (d) => d.status === "in-service",
    ).length;
    const dummyWaitingCount = allDummies.filter((d) =>
      WAITING_STATUSES.includes(d.status),
    ).length;

    res.status(200).json({
      barbers: barberStates,
      salonName: salon?.name || "",
      totalServing: greenCount + dummyServingCount,
      totalWaiting: orangeCount + dummyWaitingCount, // only active dummies, not in-service
      totalBooked: redCount,
      totalOffline: allDummies.length,
      availableNow: barberStates.filter((b) => b.status === "AVAILABLE").length,
      avgWaitTime,
      statusCounts: {
        RED: redCount,
        ORANGE: orangeCount,
        GREEN: greenCount,
        OFFLINE: allDummies.length,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Salon state error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}
