// public/distanceWorker.js

// Process in batches for faster initial render
self.onmessage = function (e) {
  const { salons, userLat, userLng } = e.data;

  const BATCH_SIZE = 10;
  const results = [];

  // Process in batches
  for (let i = 0; i < salons.length; i += BATCH_SIZE) {
    const batch = salons.slice(i, i + BATCH_SIZE);

    const processed = batch.map((salon) => {
      if (!salon.location || !Array.isArray(salon.location.coordinates)) {
        return { ...salon, distance: 999 };
      }

      const [salonLng, salonLat] = salon.location.coordinates;
      const distance = calculateDistance(userLat, userLng, salonLat, salonLng);

      return {
        ...salon,
        distance: Number(distance.toFixed(2)),
      };
    });

    results.push(...processed);

    // Send intermediate results for faster initial render
    if (i === 0) {
      self.postMessage(results.slice().sort((a, b) => a.distance - b.distance));
    }
  }

  // Send final sorted results
  results.sort((a, b) => a.distance - b.distance);
  self.postMessage(results);
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
