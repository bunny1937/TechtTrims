// pages/api/geocode.js
export default async function handler(req, res) {
  const { query, lat, lon, reverse } = req.query;

  try {
    let url;

    if (reverse === "true") {
      // Reverse geocode (coordinates to address)
      url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    } else {
      // Forward geocode (search query)
      url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=30&addressdetails=1`;
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "TechTrims/1.0 (contact@techtrims.com)",
        Accept: "application/json",
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned ${response.status}`);
    }

    const data = await response.json();

    // Add CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    res.status(200).json(data);
  } catch (error) {
    console.error("Geocode API error:", error);
    res.status(500).json({ error: "Geocoding failed", message: error.message });
  }
}
