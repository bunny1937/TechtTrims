import { connectToDatabase } from "../../../lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { latitude, longitude, radius = "10" } = req.query;
  if (!latitude || !longitude) {
    return res.status(400).json({ message: "latitude and longitude required" });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const meters = parseFloat(radius) * 1000;

  try {
    const { db } = await connectToDatabase();

    // Ensure 2dsphere index exists
    await db.collection("salons").createIndex({ location: "2dsphere" });

    // Fetch salons near location
    const salons = await db
      .collection("salons")
      .find({
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [lng, lat] },
            $maxDistance: meters,
          },
        },
      })
      .limit(50)
      .toArray();

    // 🔥 Normalize documents
    console.log(
      "Raw salons from DB:",
      salons.map((s) => ({
        name: s.salonName,
        coords: s.location?.coordinates,
      }))
    );

    const normalized = salons.map((s) => {
      // Calculate distance using coordinates
      let distance = 5; // default
      if (s.location?.coordinates && s.location.coordinates.length === 2) {
        const [salonLng, salonLat] = s.location.coordinates;
        distance = calculateDistance(lat, lng, salonLat, salonLng);
      }

      return {
        ...s,
        _id: s._id.toString(),
        distance: Number(distance.toFixed(2)),
        topServices:
          s.topServices?.map((svc) => ({
            name: String(svc.name),
            price: Number(svc.price),
          })) || [],
        stats: s.stats
          ? {
              ...s.stats,
              totalBookings: Number(s.stats.totalBookings || 0),
            }
          : { totalBookings: 0 },
      };
    });

    // Helper function for distance calculation
    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371; // Earth's radius in kilometers
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in kilometers
    }

    return res.status(200).json({ salons: normalized });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Server error", error: String(err) });
  }
}
