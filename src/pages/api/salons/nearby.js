import { connectToDatabase } from "../../../lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }
  // ✅ Add cache headers - salons don't change often
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=120",
  );

  const { latitude, longitude, radius = 30, salonGender = "all" } = req.query;

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

      const salons = await db
        .collection("salons")
        .find({
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [lng, lat],
              },
              $maxDistance: radiusKm * 1000,
            },
          },
          ...(salonGender !== "all" && { salonGender }),
        })
        .project({
          services: 1,
          location: 1,
          salonName: 1,
          stats: 1,
          stats: 1,
          ratings: 1,
          operatingHours: 1,
          profilePicture: 1,
          salonGender: 1,
          isVerified: 1,
          salonGender: 1,
        })
        .limit(30)
        .toArray();

      const processedSalons = salons.map((salon) => ({
        ...salon,
        id: salon._id.toString(),
        // Mongo $near already sorts by distance
        // We compute distance later on client (worker)
        topServices: salon.services
          ? Object.entries(salon.services)
              .filter(([, service]) => service.enabled)
              .slice(0, 3)
              .map(([name, service]) => ({
                name,
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

      return res.status(200).json({
        success: true,
        salons: processedSalons,
      });
    } catch (err) {
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
