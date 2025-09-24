// pages/api/maps/geocode.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { address } = req.body;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${apiKey}`
    );

    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return res.status(400).json({ error: "Address not found" });
    }

    const result = data.results[0];
    const location = result.geometry.location;

    res.status(200).json({
      success: true,
      coordinates: [location.lng, location.lat], // [longitude, latitude] for MongoDB
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
    });
  } catch (error) {
    console.error("Geocoding error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
