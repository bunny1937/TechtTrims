// models/Barber.js
import mongoose from "mongoose";

const BarberSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
    },
    name: { type: String, required: true },
    experience: { type: Number, default: 0 },
    skills: [{ type: String }],
    bio: { type: String, default: "" },
    photo: { type: String, default: "" },
    isAvailable: { type: Boolean, default: true },

    // ============ NEW FIELDS FOR WALK-IN SYSTEM ============
    chairNumber: {
      type: Number,
      required: true,
      index: true,
    },

    currentStatus: {
      type: String,
      enum: ["AVAILABLE", "OCCUPIED", "BREAK"],
      default: "AVAILABLE",
    },

    currentBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalkinBooking",
      default: null,
    },

    currentServiceStartTime: {
      type: Date,
      default: null,
    },

    currentServiceEndTime: {
      type: Date,
      default: null,
    },

    queueLength: {
      type: Number,
      default: 0,
    },
    // ============ END NEW FIELDS ============

    // Keep existing fields
    totalBookings: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0 },
    earnings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Barber || mongoose.model("Barber", BarberSchema);
