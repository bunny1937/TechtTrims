import { connectToDatabase } from "../../../lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { latitude, longitude, radius = 30, salonGender = "all" } = req.query;

  // 🔍 ADD DEBUGGING
  console.log("🔍 NEARBY API CALLED");
  console.log("📍 Latitude:", latitude);
  console.log("📍 Longitude:", longitude);
  console.log("📏 Radius:", radius);
  console.log("🎯 SalonGender filter:", salonGender);

  if (!latitude || !longitude) {
    return res.status(400).json({ message: "latitude and longitude required" });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const radiusKm = parseFloat(radius);

  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      const { db } = await connectToDatabase();

      // Build query
      const query = {};
      if (salonGender && salonGender !== "all") {
        query.salonGender = salonGender;
      }

      // 🔍 ADD MORE DEBUGGING
      console.log("📋 Query:", JSON.stringify(query));

      const allSalons = await db
        .collection("salons")
        .find(query)
        .maxTimeMS(30000)
        .toArray();

      console.log("📊 Total salons fetched:", allSalons.length);

      const nearbySalons = [];
      for (const salon of allSalons) {
        if (
          !salon.location?.coordinates ||
          salon.location.coordinates.length !== 2
        ) {
          console.log("⚠️ Salon missing coordinates:", salon.salonName);
          continue;
        }

        const [salonLng, salonLat] = salon.location.coordinates;

        if (isNaN(salonLat) || isNaN(salonLng)) {
          console.log("⚠️ Invalid coordinates for:", salon.salonName);
          continue;
        }

        const distance = calculateDistance(lat, lng, salonLat, salonLng);

        if (distance <= radiusKm) {
          nearbySalons.push({
            ...salon,
            calculatedDistance: distance,
          });
        }
      }

      console.log("📍 Salons within radius:", nearbySalons.length);

      const processedSalons = nearbySalons.map((salon) => ({
        ...salon,
        id: salon._id.toString(),
        distance: Number(salon.calculatedDistance.toFixed(2)),
        topServices: salon.services
          ? Object.entries(salon.services)
              .filter(([key, service]) => service.enabled)
              .slice(0, 3)
              .map(([key, service]) => ({
                name: key,
                price: Number(service.price || 0),
              }))
          : [],
        stats: {
          ...salon.stats,
          totalBookings: Number(salon.stats?.totalBookings || 0),
          rating: Number(salon.stats?.rating || 4.5),
          totalRatings: Number(salon.stats?.totalRatings || 0),
        },
      }));

      processedSalons.sort((a, b) => a.distance - b.distance);

      console.log("✅ Returning salons:", processedSalons.length);

      return res.status(200).json({
        success: true,
        salons: processedSalons,
      });
    } catch (err) {
      console.error("❌ Error in nearby API:", err);
      retryCount++;
      if (retryCount >= maxRetries) {
        return res.status(500).json({
          message: "Database connection failed after retries",
          error: err.message,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
    }
  }

  return res.status(500).json({
    message: "Failed to fetch nearby salons after all retries",
  });
}

// ✅ KEEP ONLY ONE calculateDistance FUNCTION (outside handler)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
