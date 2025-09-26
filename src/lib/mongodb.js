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
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Test the connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB!");

    return { client, db };
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);

    // Reset global cache on connection failure
    if (process.env.NODE_ENV === "development") {
      global._mongoClientPromise = null;
    }

    throw error;
  }
}
