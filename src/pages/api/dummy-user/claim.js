import clientPromise from "../../../lib/mongodb";
import { withAuth } from "../../../lib/middleware/withAuth";
import { ObjectId } from "mongodb";

async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  const { bookingCode, name, phone } = req.body;

  // withAuth sets req.user — could be a string id OR an object
  const rawUser = req.user;
  const userId =
    typeof rawUser === "string"
      ? rawUser
      : rawUser?.id || rawUser?.userId || rawUser?._id?.toString();

  console.log("CLAIM → rawUser:", JSON.stringify(rawUser), "| userId:", userId);

  if (!bookingCode || !name || !phone)
    return res
      .status(400)
      .json({ message: "bookingCode, name, and phone are required" });

  if (!userId) return res.status(401).json({ message: "Not authenticated" });

  try {
    const client = await clientPromise;
    const db = client.db("techtrims");

    // ── 1. Find dummy ─────────────────────────────────────────────────────
    const dummy = await db
      .collection("dummyusers")
      .findOne({ bookingCode: bookingCode.trim().toUpperCase() });
    if (!dummy)
      return res.status(404).json({ message: "Invalid booking code" });

    console.log("CLAIM → dummy status:", dummy.status, "| phone:", dummy.phone);

    // ── 2. Block if already claimed ───────────────────────────────────────
    if (dummy.isClaimed)
      return res
        .status(409)
        .json({ message: "This booking has already been claimed" });

    // ── 3. Name + phone match against dummy record ────────────────────────
    const nameMatch =
      dummy.name.trim().toLowerCase() === name.trim().toLowerCase();
    const phoneMatch =
      dummy.phone.replace(/\D/g, "").slice(-10) ===
      phone.replace(/\D/g, "").slice(-10);

    console.log("CLAIM → nameMatch:", nameMatch, "| phoneMatch:", phoneMatch);

    if (!nameMatch || !phoneMatch)
      return res
        .status(400)
        .json({ message: "Name or phone number does not match our records" });

    // ── 4. Verify logged-in user's phone matches dummy phone ──────────────
    let userObjectId;
    try {
      userObjectId = new ObjectId(userId);
    } catch {
      return res.status(401).json({ message: "Invalid user id in session" });
    }

    const loggedInUser = await db
      .collection("users")
      .findOne(
        { _id: userObjectId },
        { projection: { phone: 1, phoneNumber: 1, name: 1 } },
      );

    console.log("CLAIM → loggedInUser:", JSON.stringify(loggedInUser));

    if (!loggedInUser)
      return res.status(401).json({ message: "User not found" });

    const accountPhone = (loggedInUser.phone || loggedInUser.phoneNumber || "")
      .replace(/\D/g, "")
      .slice(-10);
    const dummyPhone = dummy.phone.replace(/\D/g, "").slice(-10);

    console.log(
      "CLAIM → accountPhone:",
      accountPhone,
      "| dummyPhone:",
      dummyPhone,
    );

    if (!accountPhone || accountPhone !== dummyPhone)
      return res.status(403).json({
        message:
          "This booking belongs to a different phone number. Log in with the correct account to claim it.",
      });

    // ── 5. Block duplicate conversion ─────────────────────────────────────
    const existingConversion = await db
      .collection("bookings")
      .findOne({ dummyBookingCode: dummy.bookingCode });
    if (existingConversion)
      return res.status(409).json({
        message: "This booking has already been linked to an account",
      });

    // ── 6. Mark dummy as claimed ──────────────────────────────────────────
    // Keep operational status intact — barber still needs to serve this customer
    // Just record who claimed it without changing the queue status
    await db.collection("dummyusers").updateOne(
      { _id: dummy._id },
      {
        $set: {
          isClaimed: true,
          claimedBy: userId,
          claimedAt: new Date(),
        },
      },
    );

    // ── 7. Insert booking reflecting actual service state ─────────────────
    const queueStatusMap = {
      active: "ORANGE",
      "in-service": "GREEN",
      completed: "COMPLETED",
    };

    const booking = {
      salonId: dummy.salonId,
      userId,
      customerName: dummy.name,
      customerPhone: dummy.phone,
      service: dummy.service,
      price: dummy.price,
      barberName: dummy.barberName,
      estimatedDuration: dummy.serviceTime,
      bookingType: "WALKIN",
      queueStatus: queueStatusMap[dummy.status] || "ORANGE",
      status: dummy.status === "completed" ? "completed" : "confirmed",
      arrivedAt: dummy.arrivedAt,
      serviceStartedAt: dummy.serviceStartedAt || null,
      completedAt: dummy.completedAt || null,
      createdAt: dummy.arrivedAt,
      dummyBookingCode: dummy.bookingCode,
      isOfflineConverted: true,
    };

    const result = await db.collection("bookings").insertOne(booking);

    return res.status(200).json({
      success: true,
      message: "Booking linked to your account successfully!",
      bookingId: result.insertedId,
      salonId: dummy.salonId?.toString(),
    });
  } catch (e) {
    console.error("CLAIM ERROR:", e);
    return res.status(500).json({ message: e.message });
  }
}

export default withAuth(handler);
