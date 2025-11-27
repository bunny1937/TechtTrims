//pages/api/auth/salon/register.js

import clientPromise from "../../../../lib/mongodb";
import {
  hashPassword,
  generateToken,
  getLocationFromCoordinates,
} from "../../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  const client = await clientPromise;
  const db = client.db("techtrims");
  const salons = db.collection("salons");
  const barbersCollection = db.collection("barbers");

  // ADD DATABASE CONNECTION VERIFICATION
  console.log("=== DATABASE CONNECTION DEBUG ===");
  console.log("Client connected:", !!client);
  console.log("Database name:", db.databaseName);
  console.log("Collections initialized:", !!salons && !!barbersCollection);

  // Test database write access
  try {
    await db.admin().ping();
    console.log("Database ping successful");
  } catch (pingError) {
    console.error("Database ping failed:", pingError);
  }

  console.log("=== END CONNECTION DEBUG ===");
  try {
    let {
      salonName,
      ownerName,
      email,
      phone,
      password,
      address,
      latitude,
      longitude,
      profilePicture, // new string URL for salon profile pic
      galleryImages, // new array of URLs for salon gallery
      services,
      barbers = [],
      operatingHours,
      salonGender,
      description,
      amenities,
      salonImages,
    } = req.body;

    console.log("Registration request:", {
      salonName,
      ownerName,
      barbers: barbers,
      barbersCount: barbers.length,
    });

    // Ensure latitude/longitude are numbers
    latitude = parseFloat(latitude);
    longitude = parseFloat(longitude);

    // Validate required fields
    const requiredFields = {
      salonName: "Salon name",
      ownerName: "Owner name",
      email: "Email",
      phone: "Phone number",
      password: "Password",
      address: "Address",
      latitude: "Location (latitude)",
      longitude: "Location (longitude)",
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      if (!req.body[field]) {
        return res.status(400).json({
          message: `${label} is required`,
        });
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate phone format (Indian format)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res
        .status(400)
        .json({ message: "Invalid phone number. Use 10-digit Indian format" });
    }

    // Validate password strength
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude)) {
      return res
        .status(400)
        .json({ message: "Location (latitude) is required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");
    const salons = db.collection("salons");
    const barbersCollection = db.collection("barbers"); // ADD THIS LINE

    // Check if salon already exists
    const existingSalon = await salons.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone: phone },
        { salonName: salonName.trim() },
      ],
    });

    if (existingSalon) {
      return res.status(409).json({
        message: "Salon already exists with this email, phone number, or name",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Get location details from coordinates
    let locationDetails = {};
    try {
      let locationDetails = {};
      try {
        locationDetails = await getLocationFromCoordinates(latitude, longitude);
      } catch (err) {
        console.warn("Geocoding failed:", err.message);
        locationDetails = {
          city: "",
          state: "",
          country: "India",
          postcode: "",
        };
      }
    } catch (err) {
      console.warn("Geocoding failed, falling back to defaults:", err);
      locationDetails = { city: "", state: "", country: "India", postcode: "" };
    }

    // Default services if not provided
    const defaultServices = services || [
      { name: "Haircut", price: 200, duration: 30, gender: ["Male", "Female"] },
      {
        name: "Hair Wash",
        price: 100,
        duration: 15,
        gender: ["Male", "Female"],
      },
      { name: "Beard Trim", price: 150, duration: 20, gender: ["Male"] },
      { name: "Facial", price: 500, duration: 60, gender: ["Female"] },
    ];

    // Default operating hours if not provided
    const defaultOperatingHours = operatingHours || {
      monday: { open: "09:00", close: "20:00", closed: false },
      tuesday: { open: "09:00", close: "20:00", closed: false },
      wednesday: { open: "09:00", close: "20:00", closed: false },
      thursday: { open: "09:00", close: "20:00", closed: false },
      friday: { open: "09:00", close: "20:00", closed: false },
      saturday: { open: "09:00", close: "21:00", closed: false },
      sunday: { open: "10:00", close: "19:00", closed: false },
    };

    // Create new salon
    const newSalon = {
      salonName: salonName.trim(),
      ownerName: ownerName.trim(),
      email: email.toLowerCase(),
      phone: phone,
      hashedPassword,
      role: "salon",
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        address: address.trim(),
        city: locationDetails?.city || "",
        state: locationDetails?.state || "",
        country: locationDetails?.country || "India",
        postcode: locationDetails?.postcode || "",
      },
      profilePicture: profilePicture || "", // now saved as full ImageKit CDN URL
      galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
      salonImages: Array.isArray(salonImages) ? salonImages : [],

      services: services || {},
      salonGender: salonGender || "Unisex",
      services: defaultServices,
      operatingHours: defaultOperatingHours,
      description: description || "",
      amenities: amenities || ["WiFi", "Air Conditioning", "Parking"],

      barbers: [],
      ratings: {
        overall: 0,
        serviceQuality: 0,
        timing: 0,
        ambience: 0,
        cleanliness: 0,
        totalReviews: 0,
      },
      stats: {
        totalBookings: 0,
        completedBookings: 0,
        repeatCustomers: 0,
        averageWaitTime: 0,
      },
      achievements: [],
      isVerified: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await salons.insertOne(newSalon);
    console.log("Creating salon with data:", newSalon);
    console.log("Salon created with ID:", result.insertedId);

    // CREATE BARBERS IF PROVIDED - ADD THIS SECTION
    let barbersCreatedCount = 0;
    let barberIds = [];

    if (barbers && barbers.length > 0) {
      console.log("Creating barbers for salon:", result.insertedId);

      try {
        const barberDocuments = barbers.map((barber) => ({
          salonId: result.insertedId, // Link to the salon
          name: barber.name || "",
          experience: parseInt(barber.experience) || 0,
          skills: Array.isArray(barber.skills) ? barber.skills : [],
          bio: barber.bio || "",
          photo: barber.photo || "",
          isAvailable: barber.isAvailable !== false, // Default to true
          workingHours: {
            start: "09:00",
            end: "21:00",
          },
          totalBookings: 0,
          rating: 5.0,
          accomplishments: [],
          earnings: 0,
          lastActiveAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        console.log("Inserting barbers:", barberDocuments);

        // Insert all barbers at once
        const barberResult = await barbersCollection.insertMany(
          barberDocuments
        );

        barbersCreatedCount = barberResult.insertedCount || 0;
        barberIds = Object.values(barberResult.insertedIds || {});

        console.log("Barbers created:", barbersCreatedCount);
        console.log("Barber IDs:", barberIds);

        // UPDATE SALON DOCUMENT WITH BARBER IDS
        console.log("Updating salon document with barber IDs...");
        const salonUpdateResult = await salons.updateOne(
          { _id: result.insertedId },
          {
            $set: {
              barbers: barberIds, // Add barber IDs to salon
              updatedAt: new Date(),
            },
          }
        );

        console.log("Salon update result:", salonUpdateResult);
      } catch (barberError) {
        console.error("Error creating barbers:", barberError);
        barbersCreatedCount = 0;
      }
    } else {
      console.log("No barbers provided");
    }

    // Generate JWT token
    const token = generateToken(result.insertedId, "salon", email);

    // Remove password from response
    const { hashedPassword: _, ...salonResponse } = newSalon;
    salonResponse._id = result.insertedId;
    console.log("Final barbersCreatedCount to send:", barbersCreatedCount);

    res.status(201).json({
      message: "Salon registered successfully",
      salon: salonResponse,
      barbersCreated: barbersCreatedCount, // ADD THIS LINE

      token,
    });
  } catch (error) {
    console.error("Salon registration error:", error);
    console.error("Salon registration error:", error.stack || error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
}
