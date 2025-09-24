// pages/api/bookings.js
import { connectToDatabase, clientPromise } from "../../lib/mongodb";
import { ObjectId } from "mongodb";

/**
 * This version uses a MongoDB transaction (when available) to insert booking,
 * update salon, and create/find user atomically. It also publishes a simple
 * in-memory SSE notification for subscribed salon dashboards.
 */

// simple in-memory pubsub for SSE (dev only)
const subscribers = {}; // { salonId: [res, ...] }

function publishNotification(salonId, payload) {
  // store for any connected subscribers
  const list = subscribers[salonId] || [];
  list.forEach((res) => {
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (e) {
      // ignore writes errors
    }
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  try {
    const body = req.body || {};
    const { salonId, service, barber, date, time, user } = body;

    if (!salonId || !service || !date || !time) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const { db, client } = await connectToDatabase();
    const session = client.startSession ? client.startSession() : null;
    let bookingId = null;
    let userId = null;

    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) return res.status(400).json({ message: "Invalid date" });

    const bookingDoc = {
      salonId: ObjectId.isValid(salonId) ? new ObjectId(salonId) : salonId,
      service,
      barber: barber || null,
      date,
      time,
      customerName: user?.name || body.customerName || "Guest",
      customerPhone: user?.mobile || body.customerPhone || "Unknown",
      price: body.price || 0,
      paymentStatus: "pending",
      status: "confirmed",
      createdAt: new Date()
    };

    const transactionFn = async (session) => {
      // double booking check inside transaction
      const existing = await db.collection("bookings").findOne({
        salonId: bookingDoc.salonId,
        date,
        time,
        barber: bookingDoc.barber,
        status: { $ne: "cancelled" }
      }, { session });
      if (existing) throw new Error("Slot already booked");

      const insertResult = await db.collection("bookings").insertOne(bookingDoc, { session });
      bookingId = insertResult.insertedId;

      if (user && user.mobile) {
        let existingUser = await db.collection("users").findOne({ mobile: user.mobile }, { session });
        if (!existingUser) {
          const newUser = {
            name: user.name || "Guest",
            mobile: user.mobile,
            email: user.email || null,
            gender: user.gender || "other",
            location: user.location || null,
            bookingHistory: [bookingId],
            createdAt: new Date()
          };
          const ur = await db.collection("users").insertOne(newUser, { session });
          userId = ur.insertedId;
        } else {
          userId = existingUser._id;
          await db.collection("users").updateOne({ _id: userId }, { $push: { bookingHistory: bookingId }, $set: { updatedAt: new Date() } }, { session });
        }
        await db.collection("bookings").updateOne({ _id: bookingId }, { $set: { userId } }, { session });
      }

      // update salon bookings array
      await db.collection("salons").updateOne(
        { _id: bookingDoc.salonId },
        { $push: { bookings: { _id: bookingId, date, time, service, barber } }, $set: { updatedAt: new Date() } },
        { session }
      );
    };

    if (session) {
      try {
        await session.withTransaction(async () => {
          await transactionFn(session);
        });
      } finally {
        await session.endSession();
      }
    } else {
      // fallback: not a replica set / no sessions available
      await transactionFn(null);
    }

    // Publish SSE notification (dev-time)
    try {
      publishNotification(String(salonId), { type: "new_booking", bookingId: String(bookingId), date, time, service, barber });
    } catch (e) {
      console.warn("Publish failed", e.message);
    }

    return res.status(201).json({ bookingId, userId: userId || null });
  } catch (e) {
    if (e.message && e.message.includes("Slot already booked")) {
      return res.status(409).json({ message: "Slot already booked" });
    }
    console.error("Booking API error:", e);
    return res.status(500).json({ message: e.message || "Internal server error" });
  }
}

// Expose a helper to allow SSE subscription (imported by /api/salon/notifications)
export function _subscribe(salonId, res) {
  subscribers[salonId] = subscribers[salonId] || [];
  subscribers[salonId].push(res);
  // Remove on close
  reqClose(res);
}

function reqClose(res) {
  res.on("close", () => {
    for (const sid of Object.keys(subscribers)) {
      subscribers[sid] = subscribers[sid].filter(r => r !== res);
    }
  });
}
