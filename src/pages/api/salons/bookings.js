// src/pages/api/salons/bookings.js
import { connectToDatabase } from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { salonId, date, status, from, to } = req.query;

  if (!salonId) {
    return res.status(400).json({ error: "salonId is required" });
  }

  try {
    const { client, db } = await connectToDatabase(); // Note: destructure both client and db

    // Build filter object
    const filter = {};

    // Handle salonId - could be string or ObjectId
    if (ObjectId.isValid(salonId)) {
      filter.salonId = new ObjectId(salonId);
    } else {
      filter.salonId = salonId;
    }

    // Add status filter
    if (status) {
      filter.status = status;
    }

    // Add date filter
    if (date) {
      // For specific date, match the date string exactly
      filter.date = date;
    } else if (from || to) {
      // For date range, use appointmentAt if it exists
      filter.appointmentAt = {};
      if (from) filter.appointmentAt.$gte = new Date(from);
      if (to) filter.appointmentAt.$lte = new Date(to);
    }

    console.log("Booking query filter:", JSON.stringify(filter, null, 2));

    // Query bookings
    const bookings = await db
      .collection("bookings")
      .find(filter)
      .sort({ date: 1, time: 1 })
      .limit(100)
      .toArray();

    console.log(`Found ${bookings.length} bookings for salon ${salonId}`);

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Bookings API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}
