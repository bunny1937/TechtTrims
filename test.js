// fixCoordinates.js
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function fixCoordinates() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(); // default DB from URI
  const salons = db.collection("salons");

  const allSalons = await salons
    .find({ "location.coordinates": { $exists: true } })
    .toArray();

  for (const s of allSalons) {
    const coords = s.location.coordinates;
    if (coords.length === 2) {
      const [first, second] = coords;

      // if stored as [lat, lng], flip to [lng, lat]
      if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
        const newCoords = [second, first];
        console.log(`Fixing ${s.salonName}: ${coords} -> ${newCoords}`);

        await salons.updateOne(
          { _id: s._id },
          { $set: { "location.coordinates": newCoords } }
        );
      }
    }
  }

  console.log("✅ Coordinate fix completed");
  await client.close();
}

fixCoordinates().catch(console.error);
