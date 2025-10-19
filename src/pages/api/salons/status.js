import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { salonId } = req.query;
    if (!salonId) {
      return res.status(400).json({ message: "Salon ID required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    const salon = await db
      .collection("salons")
      .findOne({ _id: new ObjectId(salonId) });
    if (!salon) {
      return res.status(404).json({ message: "Salon not found" });
    }

    const now = new Date();
    let finalStatus = "open";
    let updateFields = {};
    let unsetFields = {};

    // === PRIORITY 1: PAUSE CHECK ===
    if (salon.isPaused && salon.pauseUntil) {
      if (now < new Date(salon.pauseUntil)) {
        return res.status(200).json({
          status: "paused",
          isPaused: true,
          pauseReason: salon.pauseReason,
          pauseUntil: salon.pauseUntil,
          isActive: salon.isActive,
        });
      }
      // Resume from pause
      updateFields.isPaused = false;
      unsetFields.pauseReason = "";
      unsetFields.pauseUntil = "";
    }

    // === PRIORITY 2: OPENING TIME CHECK (FORCE OPEN) ===
    if (salon.openingTime) {
      const [h, m] = salon.openingTime.split(":");
      const openTime = new Date();
      openTime.setHours(parseInt(h), parseInt(m), 0, 0);

      if (now >= openTime) {
        // FORCE OPEN - Clear everything
        updateFields.isActive = true;
        updateFields.openedAt = now;
        unsetFields.openingTime = "";
        unsetFields.closingTime = ""; // Also clear old closing
        unsetFields.closedAt = "";
        unsetFields.closedReason = "";

        // Update immediately and return
        await db
          .collection("salons")
          .updateOne(
            { _id: salon._id },
            { $set: updateFields, $unset: unsetFields }
          );

        console.log(`✅ OPENED at ${now.toLocaleTimeString()}`);

        return res.status(200).json({
          status: "open",
          isPaused: false,
          isActive: true,
          openingTime: null,
          closingTime: null,
        });
      }
    }

    // === PRIORITY 3: CLOSING TIME CHECK ===
    if (salon.closingTime) {
      const [h, m] = salon.closingTime.split(":");
      const closeTime = new Date();
      closeTime.setHours(parseInt(h), parseInt(m), 20, 0);

      const secRemaining = Math.floor((closeTime - now) / 1000);

      if (now >= closeTime) {
        // CLOSE NOW
        updateFields.isActive = false;
        updateFields.closedAt = now;
        updateFields.closedReason = "Auto-closed";
        unsetFields.closingTime = "";
        finalStatus = "closed";
      } else if (secRemaining <= 60) {
        finalStatus = "closing";
      }
    }

    // === PRIORITY 4: IS ACTIVE CHECK ===
    if (salon.isActive === false && finalStatus !== "closing") {
      finalStatus = "closed";
    }

    // Apply updates if any
    if (
      Object.keys(updateFields).length > 0 ||
      Object.keys(unsetFields).length > 0
    ) {
      const update = {};
      if (Object.keys(updateFields).length > 0) update.$set = updateFields;
      if (Object.keys(unsetFields).length > 0) update.$unset = unsetFields;

      await db.collection("salons").updateOne({ _id: salon._id }, update);
    }

    res.status(200).json({
      status: finalStatus,
      isPaused: salon.isPaused || false,
      pauseReason: salon.pauseReason || null,
      pauseUntil: salon.pauseUntil || null,
      closingTime: unsetFields.closingTime ? null : salon.closingTime || null,
      openingTime: unsetFields.openingTime ? null : salon.openingTime || null,
      isActive:
        updateFields.isActive !== undefined
          ? updateFields.isActive
          : salon.isActive,
    });
  } catch (error) {
    console.error("Status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}
