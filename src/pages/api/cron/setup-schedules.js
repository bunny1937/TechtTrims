import { Client } from "@upstash/qstash";

export default async function handler(req, res) {
  // Only allow POST from authorized sources
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Simple auth - add a secret token
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SETUP_SECRET}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const client = new Client({ token: process.env.QSTASH_TOKEN });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    // 1. Send prebook reminders every 30 minutes
    const schedule1 = await client.schedules.create({
      destination: `${baseUrl}/api/cron/send-prebook-reminders`,
      cron: "*/30 * * * *", // Every 30 mins
    });

    // 2. Auto-complete bookings every hour
    const schedule2 = await client.schedules.create({
      destination: `${baseUrl}/api/cron/auto-complete-booking`,
      cron: "0 * * * *", // Every hour
    });

    return res.status(200).json({
      success: true,
      message: "Cron schedules created successfully",
      schedules: {
        reminders: schedule1.scheduleId,
        autoComplete: schedule2.scheduleId,
      },
    });
  } catch (error) {
    console.error("Setup schedules error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
