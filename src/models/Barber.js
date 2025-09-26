// models/Barber.js
import mongoose from "mongoose";

const BarberSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    experience: { type: Number, default: 0 }, // years
    skills: [{ type: String }], // specializations
    bio: { type: String, default: "" },
    photo: { type: String, default: "" },
    isAvailable: { type: Boolean, default: true },
    workingHours: {
      start: { type: String, default: "09:00" },
      end: { type: String, default: "21:00" },
    },
    totalBookings: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0, min: 0, max: 5 },
    accomplishments: [{ type: String }],
    earnings: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Barber || mongoose.model("Barber", BarberSchema);
