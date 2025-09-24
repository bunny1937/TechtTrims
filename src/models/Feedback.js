// models/Feedback.js
export class Feedback {
  constructor(data) {
    this.bookingId = data.bookingId;
    this.userId = data.userId;
    this.salonId = data.salonId;
    this.ratings = {
      serviceQuality: data.ratings.serviceQuality,
      timing: data.ratings.timing,
      barberPerformance: data.ratings.barberPerformance,
      salonAmbience: data.ratings.salonAmbience,
      overall: data.ratings.overall,
    };
    this.comment = data.comment || "";
    this.isPublic = data.isPublic !== undefined ? data.isPublic : true;
    this.createdAt = new Date();
  }

  static async create(feedbackData) {
    const { db } = await connectToDatabase();
    const feedback = new Feedback(feedbackData);
    const result = await db.collection("feedback").insertOne(feedback);
    return { ...feedback, _id: result.insertedId };
  }

  static async findBySalonId(salonId, options = {}) {
    const { db } = await connectToDatabase();
    const query = {
      salonId,
      isPublic: true,
    };

    let cursor = db.collection("feedback").find(query);

    if (options.sort) {
      cursor = cursor.sort(options.sort);
    } else {
      cursor = cursor.sort({ createdAt: -1 });
    }

    if (options.limit) {
      cursor = cursor.limit(options.limit);
    }

    return await cursor.toArray();
  }

  static async getSalonAverageRatings(salonId) {
    const { db } = await connectToDatabase();

    const pipeline = [
      {
        $match: {
          salonId,
          isPublic: true,
        },
      },
      {
        $group: {
          _id: null,
          avgServiceQuality: { $avg: "$ratings.serviceQuality" },
          avgTiming: { $avg: "$ratings.timing" },
          avgBarberPerformance: { $avg: "$ratings.barberPerformance" },
          avgSalonAmbience: { $avg: "$ratings.salonAmbience" },
          avgOverall: { $avg: "$ratings.overall" },
          totalReviews: { $sum: 1 },
        },
      },
    ];

    const result = await db
      .collection("feedback")
      .aggregate(pipeline)
      .toArray();
    return result[0] || null;
  }
}
