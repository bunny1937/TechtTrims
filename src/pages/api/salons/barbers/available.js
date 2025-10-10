// pages/api/salons/barbers/available.js
import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { salonId, service } = req.query;

  console.log("=== AVAILABLE BARBERS API (SALON-BASED) ===");
  console.log("SalonId:", salonId);
  console.log("Service requested:", service);

  if (!salonId) {
    return res.status(400).json({ error: "salonId required" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("techtrims");

    // Convert salonId to ObjectId
    let salonObjectId;
    try {
      salonObjectId = new ObjectId(salonId);
    } catch (objIdError) {
      console.error("Invalid salonId format:", objIdError);
      return res.status(400).json({ error: "Invalid salonId format" });
    }

    // STEP 1: Get the salon and its barber IDs
    const salon = await db
      .collection("salons")
      .findOne(
        { _id: salonObjectId },
        { projection: { barbers: 1, salonName: 1 } }
      );

    if (!salon) {
      console.log("Salon not found");
      return res.status(404).json({ error: "Salon not found" });
    }

    console.log("Found salon:", salon.salonName);
    console.log("Salon barber IDs:", salon.barbers);

    if (!salon.barbers || salon.barbers.length === 0) {
      console.log("No barbers assigned to this salon");
      return res.status(200).json([]);
    }

    // STEP 2: Get barber details using the salon's barber array
    const barberObjectIds = salon.barbers.map((id) =>
      typeof id === "string" ? new ObjectId(id) : id
    );

    const barberQuery = {
      _id: { $in: barberObjectIds },
    };

    console.log("Barber query:", JSON.stringify(barberQuery, null, 2));

    const allBarbers = await db
      .collection("barbers")
      .find(barberQuery)
      .toArray();

    console.log("Found available barbers:", allBarbers.length);
    allBarbers.forEach((barber) => {
      console.log(
        `- ${barber.name}: skills = [${barber.skills?.join(", ") || "none"}]`
      );
    });

    // If no service specified, return all available barbers
    if (!service) {
      return res
        .status(200)
        .json(allBarbers.sort((a, b) => b.rating - a.rating));
    }

    // STEP 3: Filter by skills if service is specified
    const getMatchingSkills = (serviceName) => {
      const serviceMap = {
        haircut: ["Haircut"],
        Shave: ["Shaving"],
        HairStyling: ["Hair Styling"],
        HairColor: ["Hair Color"],
        Facial: ["Facial"],
        HairWash: ["Hair Wash"],
      };

      // Try exact match first
      if (serviceMap[serviceName]) {
        return serviceMap[serviceName];
      }

      // Try case-insensitive match
      const lowerService = serviceName.toLowerCase();
      for (const [key, skills] of Object.entries(serviceMap)) {
        if (key.toLowerCase() === lowerService) {
          return skills;
        }
      }

      return [serviceName];
    };

    const matchingSkills = getMatchingSkills(service);
    console.log(`Service "${service}" mapped to skills:`, matchingSkills);

    const filteredBarbers = allBarbers.filter((barber) => {
      if (!barber.skills || !Array.isArray(barber.skills)) {
        return false;
      }

      const hasMatchingSkill = barber.skills.some((skill) =>
        matchingSkills.some(
          (reqSkill) =>
            skill.toLowerCase().includes(reqSkill.toLowerCase()) ||
            reqSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );

      console.log(
        `Barber ${barber.name} has matching skill for "${service}":`,
        hasMatchingSkill
      );
      return hasMatchingSkill;
    });

    // Return skilled barbers first, or all barbers if none skilled
    const result = filteredBarbers.length > 0 ? filteredBarbers : allBarbers;

    console.log("Returning barbers:", result.length);
    return res.status(200).json(result.sort((a, b) => b.rating - a.rating));
  } catch (err) {
    console.error("Available barbers API error:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
}
