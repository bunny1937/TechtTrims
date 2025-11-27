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
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });
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
    if (isNaN(bookingDate.getTime()))
      return res.status(400).json({ message: "Invalid date" });

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
      createdAt: new Date(),
    };

    const transactionFn = async (session) => {
      // double booking check inside transaction
      const existing = await db.collection("bookings").findOne(
        {
          salonId: bookingDoc.salonId,
          date,
          time,
          barber: bookingDoc.barber,
          status: { $ne: "cancelled" },
        },
        { session }
      );
      if (existing) throw new Error("Slot already booked");

      const insertResult = await db
        .collection("bookings")
        .insertOne(bookingDoc, { session });
      bookingId = insertResult.insertedId;

      // Create or find user - Enhanced user handling
      if (user && user.mobile) {
        let existingUser = await db
          .collection("users")
          .findOne({ mobile: user.mobile }, { session });
        if (!existingUser) {
          const newUser = {
            name: user.name || "Guest",
            mobile: user.mobile,
            email: user.email || null,
            gender: user.gender || "other",
            location: user.location || null,
            bookingHistory: [bookingId],
            preferences: user.preferences || {},
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
          };
          const ur = await db
            .collection("users")
            .insertOne(newUser, { session });
          userId = ur.insertedId;
        } else {
          userId = existingUser._id;
          // Update existing user's booking history and preserve location data
          await db.collection("users").updateOne(
            { _id: userId },
            {
              $push: { bookingHistory: bookingId },
              $set: {
                // Update location if new location data is provided
                ...(user.location && { location: user.location }),
              },
            },
            { session }
          );
        }

        // Always link booking to user
        await db
          .collection("bookings")
          .updateOne({ _id: bookingId }, { $set: { userId } }, { session });
      }

      // If userId from token is available, also link the booking
      if (body.userId) {
        await db
          .collection("bookings")
          .updateOne(
            { _id: bookingId },
            { $set: { userId: new ObjectId(body.userId) } },
            { session }
          );

        // Update user's booking history
        await db.collection("users").updateOne(
          { _id: new ObjectId(body.userId) },
          {
            $push: { bookingHistory: bookingId },
          },
          { session }
        );
      }

      // update salon bookings array AND stats
      await db.collection("salons").updateOne(
        { _id: bookingDoc.salonId },
        {
          $push: {
            bookings: {
              id: bookingId,
              date,
              time,
              service,
              barber,
            },
          },
          $inc: { "stats.totalBookings": 1 },
        },
        { session }
      );

      // Calculate and update repeat customers
      const repeatCustomers = await db.collection("bookings").distinct(
        "userId",
        {
          salonId: bookingDoc.salonId,
          userId: { $ne: null },
        },
        { session }
      );

      await db
        .collection("salons")
        .updateOne(
          { _id: bookingDoc.salonId },
          { $set: { "stats.repeatCustomers": repeatCustomers.length } },
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
      publishNotification(String(salonId), {
        type: "new_booking",
        bookingId: String(bookingId),
        date,
        time,
        service,
        barber,
      });
    } catch (e) {
      console.warn("Publish failed", e.message);
    }

    return res.status(201).json({ bookingId, userId: userId || null });
  } catch (e) {
    if (e.message && e.message.includes("Slot already booked")) {
      return res.status(409).json({ message: "Slot already booked" });
    }
    console.error("Booking API error:", e);
    return res
      .status(500)
      .json({ message: e.message || "Internal server error" });
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
      subscribers[sid] = subscribers[sid].filter((r) => r !== res);
    }
  });
}
