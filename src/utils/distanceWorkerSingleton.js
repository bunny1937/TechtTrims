// src/utils/distanceWorkerSingleton.js
let worker = null;

export function getDistanceWorker() {
  if (!worker && typeof window !== "undefined") {
    // Create inline worker instead of loading from file
    const workerCode = `
      self.onmessage = function (e) {
        const { salons, userLat, userLng } = e.data;
        
        const results = salons.map((salon) => {
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
    `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    if (!worker) {
      worker = new Worker(URL.createObjectURL(blob));
    }
  }
  return worker;
}
