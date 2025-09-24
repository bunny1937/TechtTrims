// src/models/Booking.js - Match your actual database structure
import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
      index: true,
    },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    service: { type: String, required: true }, // Change from serviceId to service (string)
    barber: { type: String, default: null }, // Change from staffId to barber (string)
    date: { type: String, required: true }, // Your DB uses string dates like "2025-09-25"
    time: { type: String, required: true }, // Your DB uses string times like "14:00"
    price: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid"],
      default: "pending",
    },
    status: {
      type: String,
      enum: [
        "requested",
        "confirmed", // Your DB uses "confirmed" not "accepted"
        "completed",
        "cancelled",
      ],
      default: "confirmed",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    feedback: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);
