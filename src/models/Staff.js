// models/Staff.js
import mongoose from "mongoose";

const StaffSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    skills: [{ type: String }],
    workingHours: {
      start: { type: String, default: "09:00" },
      end: { type: String, default: "21:00" },
    },
    photo: { type: String, default: "" },
    bio: { type: String, default: "" },
    isAvailable: { type: Boolean, default: true },
    earnings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Staff || mongoose.model("Staff", StaffSchema);
