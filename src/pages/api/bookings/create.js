import { connectToDatabase, clientPromise } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { updateSalonStats } from "../../../lib/statsHelper";
import { csrfMiddleware } from "../../../lib/middleware/csrf";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { db, client } = await connectToDatabase();
    const {
      salonId,
      service,
      barber,
      barberId,
      date,
      time,
      user,
      price,
      customerName,
      customerPhone,
      userId,
    } = req.body;

    if (!salonId || !service || !date || !time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const session = client.startSession ? client.startSession() : null;
    let bookingId = null;
    let finalUserId = null;

    const transactionFn = async (session) => {
      // Check for existing booking inside transaction
      const existingBooking = await db.collection("bookings").findOne(
        {
          salonId: ObjectId.isValid(salonId) ? new ObjectId(salonId) : salonId,
          date,
          time,
          status: { $ne: "cancelled" },
        },
        { session }
      );

      if (existingBooking) {
        throw new Error("Time slot already booked");
      }

      const bookingData = {
        salonId: ObjectId.isValid(salonId) ? new ObjectId(salonId) : salonId,
        service,
        barber: barber || null,
        barberId: barberId ? new ObjectId(barberId) : null,
        date,
        time,
        customerName: customerName || user?.name || "Guest",
        customerPhone:
          customerPhone ||
          user?.phoneNumber ||
          user?.phone ||
          user?.mobile ||
          "",
        customerAge: user?.age || null,
        customerGender: user?.gender || null,
        customerLocation: user?.location || null,
        price: price || 0,
        paymentStatus: "pending",
        status: "confirmed",
        userId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        feedback: {
          submitted: false,
          ratings: {},
          comment: "",
        },
      };

      const result = await db
        .collection("bookings")
        .insertOne(bookingData, { session });
      bookingId = result.insertedId;

      // Enhanced user handling - Create or find user
      if (userId && ObjectId.isValid(userId)) {
        // Authenticated user booking
        finalUserId = new ObjectId(userId);
        await db
          .collection("bookings")
          .updateOne(
            { _id: bookingId },
            { $set: { userId: finalUserId } },
            { session }
          );

        // Update user's booking history
        await db.collection("users").updateOne(
          { _id: finalUserId },
          {
            $push: { bookingHistory: bookingId },
          },
          { session }
        );
      } else if (user && (user.phone || user.mobile)) {
        // Anonymous user booking - create or find user
        const phoneNumber = user.phone || user.mobile || customerPhone;
        let existingUser = await db.collection("users").findOne(
          {
            $or: [{ phone: phoneNumber }, { mobile: phoneNumber }],
          },
          { session }
        );

        if (!existingUser) {
          const newUser = {
            name: user.name || "Guest",
            mobile: user.phoneNumber || user.mobile,
            phone: user.phoneNumber || user.phone,
            phoneNumber: user.phoneNumber || user.mobile,
            email: user.email || null,
            gender: user.gender || "other",
            age: user.age || null,
            dateOfBirth: user.dateOfBirth || null,
            location: user.location || null,
            bookingHistory: [bookingId],
            preferences: user.preferences || {},
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
          };

          const userResult = await db
            .collection("users")
            .insertOne(newUser, { session });
          finalUserId = userResult.insertedId;
        } else {
          finalUserId = existingUser._id;
          // Update existing user's booking history and preserve location data
          await db.collection("users").updateOne(
            { _id: finalUserId },
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
          .updateOne(
            { _id: bookingId },
            { $set: { userId: finalUserId } },
            { session }
          );
      }

      // Update salon bookings array
      await db.collection("salons").updateOne(
        { _id: ObjectId.isValid(salonId) ? new ObjectId(salonId) : salonId },
        {
          $push: {
            bookings: { _id: bookingId, date, time, service, barber },
          },
        },
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
    await updateSalonStats(salonId);

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      bookingId: bookingId,
      _id: bookingId,
      userId: finalUserId,
    });
  } catch (error) {
    if (error.message && error.message.includes("Time slot already booked")) {
      return res.status(409).json({ error: "Time slot already booked" });
    }
    console.error("Booking creation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
export default csrfMiddleware(handler);
