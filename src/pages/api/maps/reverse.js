// pages/api/maps/reverse.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { lat, lng } = req.body ?? {};

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: "lat and lng are required" });
  }

  try {
    // Nominatim requires a proper User-Agent identifying your app (and ideally contact info).
    // Replace contact@yourdomain.com with a valid email/domain.
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "TechTrims/1.0 (techtrims1@gmail.com)",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("Nominatim returned non-OK:", response.status, body);
      return res
        .status(response.status)
        .json({ error: "Reverse geocoding provider error" });
    }

    const data = await response.json();
    const displayName = data.display_name || null;

    // Return the human-readable address (and raw if you want it for debugging)
    return res.status(200).json({ address: displayName, raw: data });
  } catch (err) {
    console.error("Reverse geocoding error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
