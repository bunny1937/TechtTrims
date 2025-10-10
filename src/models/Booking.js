// src/models/Booking.js - Match your actual database structure
import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    salonId: { type: ObjectId, required: true, index: true },
    customerName: { type: String, required: true },
    service: { type: String, required: true },
    barberId: { type: ObjectId, ref: "Barber", required: true, index: true },
    date: { type: String, required: true, index: true },
    time: { type: String, required: true },

    // NEW FIELDS FOR WALKIN WORKFLOW
    bookingType: {
      type: String,
      enum: ["WALKIN_ONLINE"],
      default: "WALKIN_ONLINE",
      index: true,
    },

    // Queue & Status Management
    queueStatus: {
      type: String,
      enum: ["RED", "ORANGE", "GREEN", "EXPIRED", "COMPLETED"],
      default: "RED",
    },
    queuePosition: { type: Number, default: null },

    // Unique Booking Identifier & QR
    bookingCode: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    qrCodeUrl: { type: String },

    // Expiry Management
    expiresAt: { type: Date, required: true },
    arrivedAt: { type: Date, default: null },
    isExpired: { type: Boolean, default: false },

    // Service Duration Tracking
    estimatedDuration: { type: Number, required: true }, // in minutes
    actualDuration: { type: Number, default: null },
    serviceStartedAt: { type: Date, default: null },
    serviceEndedAt: { type: Date, default: null },

    // Barber Selection Tracking
    selectedDuration: { type: Number, default: null },

    // Real-time Updates
    lastUpdated: { type: Date, default: Date.now },

    // Previous status tracking
    status: {
      enum: [
        "confirmed",
        "arrived",
        "in_service",
        "completed",
        "cancelled",
        "expired",
      ],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);
