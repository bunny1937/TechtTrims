// test.js
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri =
  "mongodb+srv://techtrims2025:Techtrims2025db@cluster0.bfnik5y.mongodb.net/techtrims?retryWrites=true&w=majority&tls=true&serverSelectionTimeoutMS=5000&appName=Cluster0";
const dbName = "techtrims";

if (!uri) {
  throw new Error("Please add your Mongo URI to .env.local (MONGODB_URI)");
}

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 5000,
  maxIdleTimeMS: 30000,
};
function capitalizeWords(str) {
  return str
    .split(/(?=[A-Z])| /) // split on camelCase or space
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

async function fixServiceNames() {
  const client = new MongoClient(uri, options);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB!");

    const db = client.db(dbName);
    const salons = db.collection("salons");

    const cursor = salons.find({ services: { $exists: true } });

    while (await cursor.hasNext()) {
      const salon = await cursor.next();

      const updatedServices = {};
      for (const [key, value] of Object.entries(salon.services)) {
        const newKey = capitalizeWords(key);
        updatedServices[newKey] = value;
      }

      await salons.updateOne(
        { _id: salon._id },
        { $set: { services: updatedServices } }
      );

      console.log(`Updated salon ${salon._id}`);
    }

    console.log("✅ All top-level service keys capitalized.");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
    console.log("MongoDB connection closed.");
  }
}

fixServiceNames();
