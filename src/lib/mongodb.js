// lib/mongodb.js
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;

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
  // REMOVED: bufferMaxEntries - this option is deprecated/not supported
};

if (!uri) {
  throw new Error("Please add your Mongo URI to .env.local (MONGODB_URI)");
}

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function connectToDatabase() {
  const MAX_RETRIES = 3;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB);
      await client.db("admin").command({ ping: 1 });
      console.log("✅ Connected to MongoDB!");
      return { client, db };
    } catch (error) {
      retries++;
      console.error(
        `❌ Database connection failed (attempt ${retries}/${MAX_RETRIES}):`,
        error.message
      );

      if (process.env.NODE_ENV === "development") {
        global._mongoClientPromise = null;
      }

      if (retries === MAX_RETRIES) {
        throw new Error(`Failed to connect after ${MAX_RETRIES} attempts`);
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
    }
  }
}
