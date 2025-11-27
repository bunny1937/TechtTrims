// models/Salon.js
export class Salon {
  constructor(data) {
    this.ownerDetails = {
      name: data.ownerDetails.name,
      mobile: data.ownerDetails.mobile,
      email: data.ownerDetails.email,
      password: data.ownerDetails.password, // Should be hashed
    };
    this.salonDetails = {
      name: data.salonDetails.name,
      address: data.salonDetails.address,
      location: data.salonDetails.location || {
        type: "Point",
        coordinates: [0, 0],
      },
      openingHours: data.salonDetails.openingHours || {
        open: "09:00",
        close: "21:00",
      },
      images: data.salonDetails.images || [],
      description: data.salonDetails.description || "",
    };
    this.salonGender = data.salonGender || "Unisex";
    this.services = data.services || [];
    this.barbers = data.barbers || [];
    this.ratings = data.ratings || {
      overall: 5.0,
      totalReviews: 0,
      serviceQuality: 5.0,
      timing: 5.0,
      cleanliness: 5.0,
      ambience: 5.0,
    };
    this.stats = data.stats || {
      totalBookings: 0,
      repeatCustomers: 0,
      averageWaitTime: 10,
    };
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static async create(salonData) {
    const { db } = await connectToDatabase();
    const salon = new Salon(salonData);

    // Create geospatial index for location-based queries
    await db
      .collection("salons")
      .createIndex({ "salonDetails.location": "2dsphere" });

    const result = await db.collection("salons").insertOne(salon);
    return { ...salon, _id: result.insertedId };
  }

  static async findById(id) {
    const { db } = await connectToDatabase();
    return await db.collection("salons").findOne({ _id: new ObjectId(id) });
  }

  static async findByOwnerEmail(email) {
    const { db } = await connectToDatabase();
    return await db
      .collection("salons")
      .findOne({ "ownerDetails.email": email });
  }

  static async findNearby(coordinates, radius = 5000, options = {}) {
    const { db } = await connectToDatabase();

    const pipeline = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: coordinates, // [longitude, latitude]
          },
          distanceField: "distance",
          maxDistance: radius,
          spherical: true,
        },
      },
      {
        $match: { isActive: true },
      },
    ];

    // Add salon gender filtering if specified
    if (options.salonGender && options.salonGender !== "all") {
      pipeline.push({
        $match: { salonGender: options.salonGender },
      });
    }

    // Add gender-based service filtering if specified
    if (options.gender) {
      pipeline.push({
        $addFields: {
          relevantServices: {
            $filter: {
              input: "$services",
              cond: {
                $or: [
                  { $eq: ["$$this.genderSpecific", "unisex"] },
                  { $eq: ["$$this.genderSpecific", options.gender] },
                ],
              },
            },
          },
        },
      });
    }

    pipeline.push(
      {
        $addFields: {
          topServices: { $slice: ["$relevantServices", 4] },
          distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 1] },
        },
      },
      {
        $project: {
          "ownerDetails.password": 0,
        },
      },
      { $limit: options.limit || 20 }
    );

    return await db.collection("salons").aggregate(pipeline).toArray();
  }

  static async updateById(id, updateData) {
    const { db } = await connectToDatabase();
    const result = await db.collection("salons").updateOne(
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

  static async incrementBookingCount(id) {
    const { db } = await connectToDatabase();
    return await db.collection("salons").updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: { "stats.totalBookings": 1 },
      }
    );
  }

  static async updateRatings(id, newRatings) {
    const { db } = await connectToDatabase();
    return await db.collection("salons").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          "ratings.overall": newRatings.overall,
          "ratings.serviceQuality": newRatings.serviceQuality,
          "ratings.timing": newRatings.timing,
          "ratings.cleanliness": newRatings.cleanliness,
          "ratings.ambience": newRatings.ambience,
          "ratings.totalReviews": newRatings.totalReviews,
          updatedAt: new Date(),
        },
      }
    );
  }
}
