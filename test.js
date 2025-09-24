import { MongoClient } from "mongodb";

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function fixLocations() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(); // uses DB from your URI

    const salons = await db.collection("salons").find().toArray();

    for (const salon of salons) {
      if (
        salon.location &&
        salon.location.latitude !== undefined &&
        salon.location.longitude !== undefined
      ) {
        const updatedLocation = {
          type: "Point",
          coordinates: [salon.location.longitude, salon.location.latitude],
          address: salon.location.address || "",
          city: salon.location.city || "",
          state: salon.location.state || "",
          country: salon.location.country || "",
          postcode: salon.location.postcode || "",
        };

        await db
          .collection("salons")
          .updateOne(
            { _id: salon._id },
            { $set: { location: updatedLocation } }
          );
      }
    }

    console.log("All salon locations updated to GeoJSON ✅");
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

fixLocations();
