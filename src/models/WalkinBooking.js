import mongoose from "mongoose";

const WalkinBookingSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
      index: true,
    },

    barberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barber",
      required: true,
      index: true,
    },

    // Customer Info
    customerName: {
      type: String,
      required: true,
    },

    customerPhone: {
      type: String,
      required: true,
    },

    // Service
    service: {
      type: String,
      required: true,
    },

    // Unique Booking Identifier
    bookingCode: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    qrCodeData: {
      type: String, // Base64 encoded QR code
    },

    // Queue Status: RED → ORANGE → GREEN → COMPLETED
    queueStatus: {
      type: String,
      enum: ["RED", "ORANGE", "GREEN", "COMPLETED", "EXPIRED"],
      default: "RED",
      index: true,
    },

    // Timestamps
    expiresAt: {
      type: Date,
      required: true, // 45 minutes from creation
    },

    arrivedAt: {
      type: Date,
      default: null,
    },

    serviceStartedAt: {
      type: Date,
      default: null,
    },

    serviceEndedAt: {
      type: Date,
      default: null,
    },

    // Duration (in minutes)
    estimatedDuration: {
      type: Number,
      required: true,
    },

    selectedDuration: {
      type: Number, // Barber selects this when starting
      default: null,
    },

    actualDuration: {
      type: Number,
      default: null,
    },

    isExpired: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.WalkinBooking ||
  mongoose.model("WalkinBooking", WalkinBookingSchema);
