import mongoose from "mongoose";

const DummyUserSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, required: true, unique: true, index: true },
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
      index: true,
    },
    barberId: mongoose.Schema.Types.ObjectId,

    barberName: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    service: { type: String, required: true },
    price: { type: Number, required: true },
    serviceTime: { type: Number, required: true },
    createdBy: { type: String, enum: ["barber", "salon"], required: true },
    status: {
      type: String,
      enum: ["active", "claimed", "completed"],
      default: "active",
    },
    isClaimed: { type: Boolean, default: false },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    arrivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.models.DummyUser ||
  mongoose.model("DummyUser", DummyUserSchema);
