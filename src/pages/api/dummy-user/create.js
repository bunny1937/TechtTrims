import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

function generate6DigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  const {
    salonId,
    barberId,
    barberName,
    name,
    phone,
    service,
    price,
    serviceTime,
    createdBy,
  } = req.body;

  if (
    !salonId ||
    !barberName ||
    !name ||
    !phone ||
    !service ||
    !price ||
    !serviceTime ||
    !createdBy
  )
    return res.status(400).json({ message: "All fields required" });

  try {
    const client = await clientPromise;
    const db = client.db("techtrims");

    let code, exists;
    do {
      code = generate6DigitCode();
      exists = await db.collection("dummyusers").findOne({ bookingCode: code });
    } while (exists);

    const doc = {
      bookingCode: code,
      salonId: new ObjectId(salonId),
      barberId: barberId ? new ObjectId(barberId) : undefined,
      barberName,
      name,
      phone,
      service,
      price: Number(price),
      serviceTime: Number(serviceTime),
      createdBy,
      status: "active",
      arrivedAt: new Date(),
      createdAt: new Date(),
    };

    const result = await db.collection("dummyusers").insertOne(doc);
    const dummy = { ...doc, _id: result.insertedId };

    return res.status(201).json({ success: true, dummy });
  } catch (e) {
    console.error("DummyUser create error:", e);
    return res.status(500).json({ message: e.message });
  }
}
