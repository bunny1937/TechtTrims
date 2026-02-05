// This runs in a separate thread
self.onmessage = function (e) {
  const { salons, userLat, userLng, radius } = e.data;

  const updated = salons.map((salon) => {
    if (!salon.location || !Array.isArray(salon.location.coordinates)) {
      return salon;
    }

    const [salonLng, salonLat] = salon.location.coordinates;

    const distance = calculateDistance(userLat, userLng, salonLat, salonLng);

    return {
      ...salon,
      distance: Number(distance.toFixed(2)),
    };
  });

  self.postMessage(updated);
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
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
