// models/Booking.js
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
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
    status: {
      type: String,
      enum: [
        "requested",
        "accepted",
        "rescheduled",
        "completed",
        "cancelled",
        "no-show",
      ],
      default: "requested",
    },
    appointmentAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: 30 },
    price: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);
