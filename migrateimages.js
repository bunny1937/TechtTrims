import bcryptjs from "bcryptjs";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const bcrypt = bcryptjs;

async function resetAdmin() {
  const uri = process.env.MONGODB_URI;
  const password = "Admin@123";

  console.log("🔄 Starting admin password reset...");
  console.log("Password to set:", password);

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("techtrims");

    // Step 1: Generate hash
    console.log(
      "\n🔄 Step 1: Generating bcrypt hash (this takes ~1 second)..."
    );
    const hash = await bcrypt.hash(password, 12);
    console.log("✅ Hash generated:", hash);
    console.log("   Hash length:", hash.length);

    // Step 2: Test the hash locally first
    console.log("\n🔄 Step 2: Testing hash locally...");
    const testMatch = await bcrypt.compare(password, hash);
    console.log("✅ Local test result:", testMatch);

    if (!testMatch) {
      console.error("❌ Hash generation failed!");
      process.exit(1);
    }

    // Step 3: Update database
    console.log("\n🔄 Step 3: Updating database...");
    const result = await db.collection("admins").updateOne(
      { _id: new ObjectId("68e2240233fd3aee4eaf6518") },
      {
        $set: {
          hashedPassword: hash,
          updatedAt: new Date(),
        },
      }
    );

    console.log(
      "✅ Update result:",
      result.modifiedCount,
      "documents modified"
    );

    // Step 4: Verify what was stored
    console.log("\n🔄 Step 4: Verifying database...");
    const admin = await db.collection("admins").findOne({
      _id: new ObjectId("68e2240233fd3aee4eaf6518"),
    });

    console.log("✅ Admin found:", !!admin);

    // Step 5: Test the stored hash
    console.log("\n🔄 Step 5: Testing stored hash...");
    const storedMatch = await bcrypt.compare(password, admin.hashedPassword);
    console.log("✅ Stored hash test result:", storedMatch);

    if (storedMatch) {
      console.log("\n✅✅✅ SUCCESS! Admin password is ready for login");
      console.log("Username: Bhavani2319");
      console.log("Password: Admin@123");
    } else {
      console.error("\n❌ FAILED! Hash does not match");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
  }
}

resetAdmin();
