// models/User.js
import { connectToDatabase } from "../lib/mongodb";
import { ObjectId } from "mongodb";

export class User {
  constructor(data) {
    this.name = data.name;
    this.mobile = data.mobile;
    this.email = data.email || null;
    this.gender = data.gender || "male";
    this.location = data.location || null;
    this.preferences = data.preferences || {
      favoriteServices: [],
      preferredPriceRange: { min: 0, max: 2000 },
    };
    this.bookingHistory = data.bookingHistory || [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static async create(userData) {
    const { db } = await connectToDatabase();
    const user = new User(userData);
    const result = await db.collection("users").insertOne(user);
    return { ...user, _id: result.insertedId };
  }

  static async findById(id) {
    const { db } = await connectToDatabase();
    return await db.collection("users").findOne({ _id: new ObjectId(id) });
  }

  static async findByMobile(mobile) {
    const { db } = await connectToDatabase();
    return await db.collection("users").findOne({ mobile });
  }

  static async findByEmail(email) {
    const { db } = await connectToDatabase();
    return await db.collection("users").findOne({ email });
  }

  static async updateById(id, updateData) {
    const { db } = await connectToDatabase();
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      }
    );
    return result.modifiedCount > 0;
  }

  static async addBookingToHistory(userId, bookingId) {
    const { db } = await connectToDatabase();
    return await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $push: { bookingHistory: bookingId },
        $set: { updatedAt: new Date() },
      }
    );
  }
}
