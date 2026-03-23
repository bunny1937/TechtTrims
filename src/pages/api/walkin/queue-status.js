import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { barberId, salonId, customerId } = req.body;

    if (!barberId || !salonId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const barberIdString = barberId?.toString?.() || barberId;
    let barberObjectId;
    try {
      barberObjectId = new ObjectId(barberId);
    } catch (err) {
      barberObjectId = null;
    }

    let salonObjectId;
    try {
      salonObjectId = new ObjectId(salonId);
    } catch (err) {
      salonObjectId = null;
    }

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Get ALL bookings for this barber today
    const allBookings = await db
      .collection("bookings")
      .find({
        barberId: { $in: [barberIdString, barberObjectId].filter(Boolean) },
        salonId: { $in: [salonId, salonObjectId].filter(Boolean) },
        queueStatus: { $in: ["GREEN", "ORANGE", "RED"] },
        isExpired: { $ne: true },
        createdAt: { $gte: todayStart },
      })
      .sort({ createdAt: 1 })
      .toArray();

    // ✅ SEPARATE: Currently Serving
    const serving = allBookings.filter((e) => e.queueStatus === "GREEN");

    // ✅ GOLDEN: Arrived at salon (priority queue)
    const arrived = allBookings.filter((e) => e.queueStatus === "ORANGE");

    // ✅ GREY: Booked but NOT arrived (temporary/booking queue)
    const booked = allBookings.filter((e) => e.queueStatus === "RED");

    // Current customer
    let currentCustomer = null;
    if (serving.length > 0) {
      const customer = serving[0];
      const elapsed = Math.round(
        (now - new Date(customer.serviceStartedAt || now)) / 60000,
      );
      const duration =
        customer.selectedDuration || customer.estimatedDuration || 45;
      const timeLeft = Math.max(0, duration - elapsed);

      currentCustomer = {
        id: customer._id.toString(),
        name: customer.customerName,
        timeLeft,
        startedAt: customer.serviceStartedAt,
        estimatedDuration: customer.estimatedDuration || duration,
        isCurrentUser: customerId && customer._id.toString() === customerId,
      };
    }

    // ✅ PRIORITY QUEUE: Arrived customers first
    const priorityQueue = arrived
      .sort((a, b) => new Date(a.arrivedAt) - new Date(b.arrivedAt))
      .map((customer, idx) => ({
        id: customer._id.toString(),
        name: customer.customerName,
        arrivedAt: customer.arrivedAt, // ← REQUIRED for sort in confirmation.js
        position: idx + 1,
        queue: "arrived",
        isCurrentUser: customerId && customer._id.toString() === customerId,
      }));
    // ✅ TEMPORARY QUEUE: Booked but not arrived
    const tempQueue = booked.map((customer, idx) => {
      const expiryTime = customer.expiresAt
        ? new Date(customer.expiresAt)
        : null;
      const minutesLeft = expiryTime
        ? Math.max(0, Math.round((expiryTime - now) / 60000))
        : 0;

      return {
        id: customer._id.toString(),
        name: customer.customerName,
        position: priorityQueue.length + idx + 1, // After all arrived
        queue: "booked", // Grey
        expiresIn: minutesLeft,
        isExpired: customer.queueStatus === "RED" && minutesLeft === 0,
        isCurrentUser: customerId && customer._id.toString() === customerId,
      };
    });

    // Combine for display
    const waitingCustomers = [...priorityQueue, ...tempQueue];

    // Fetch dummy (offline) users for this salon+barber
    let dummyUsers = [];
    try {
      let salonObjId;
      try {
        salonObjId = new ObjectId(salonId);
      } catch {
        salonObjId = salonId;
      }
      // Single barber doc fetch
      const barberDoc = barberObjectId
        ? await db
            .collection("barbers")
            .findOne({ _id: barberObjectId }, { projection: { name: 1 } })
        : null;

      dummyUsers = await db
        .collection("dummyusers")
        .find({
          salonId: salonObjId,
          status: { $nin: ["completed", "cancelled"] },
          ...(barberDoc
            ? {
                $or: [
                  { barberId: barberObjectId },
                  { barberName: barberDoc.name },
                ],
              }
            : {}),
        })
        .sort({ arrivedAt: 1 })
        .toArray();
    } catch (e) {
      // silent — dummies are supplementary
    }

    res.status(200).json({
      success: true,
      currentCustomer,
      waitingCustomers,
      dummyUsers: dummyUsers.map((d) => ({
        _id: d._id.toString(),
        name: d.name,
        phone: d.phone,
        service: d.service,
        price: d.price,
        serviceTime: d.serviceTime,
        barberName: d.barberName,
        bookingCode: d.bookingCode,
        arrivedAt: d.arrivedAt,
        status: d.status,
        serviceStartedAt: d.serviceStartedAt || null,
        expectedFinishTime: d.expectedFinishTime || null,
      })),
      barberStats: {
        serving: serving.length,
        waiting: arrived.length,
        temporary: booked.length,
        offline: dummyUsers.length,
      },
      totalInQueue: arrived.length + booked.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Queue error:", error);
    res.status(500).json({ error: error.message });
  }
}
