// src/lib/maps.js (only the reverseGeocode part shown)
export const geocodeAddress = async (address) => {
  try {
    const res = await fetch("/api/maps/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Geocoding failed");
    }

    const data = await res.json();
    return data; // { coordinates: [lng, lat], formattedAddress: string }
  } catch (error) {
    console.error("Geocoding error:", error);
    throw error;
  }
};

export const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch("/api/maps/reverse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Reverse geocoding failed");
    }

    const data = await res.json();
    return data.address; // string or null
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    throw error;
  }
};
