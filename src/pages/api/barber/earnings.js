// src/pages/api/barber/earnings.js
import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";
import { withBarberAuth } from "../../../lib/middleware/withBarberAuth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { barberId, month, year } = req.query;

    if (!barberId) {
      return res.status(400).json({ error: "barberId required" });
    }

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Default to current month/year
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;

    // Month date range
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 1);

    // Get barber details
    const barber = await db.collection("barbers").findOne({
      _id: new ObjectId(barberId),
    });

    if (!barber) {
      return res.status(404).json({ error: "Barber not found" });
    }

    // Get all completed bookings for this month
    const monthlyBookings = await db
      .collection("bookings")
      .find({
        barberId: new ObjectId(barberId),
        status: "completed",
        serviceEndedAt: { $gte: startDate, $lt: endDate },
      })
      .toArray();

    // Calculate monthly earnings (₹300 per service as example)
    const serviceRate = 300;
    const monthlyEarnings = monthlyBookings.length * serviceRate;

    // Calculate tips (random 10-20% of bookings get tips)
    const tips = monthlyBookings.reduce((sum, booking) => {
      const hasTip = Math.random() > 0.8; // 20% chance
      return sum + (hasTip ? Math.floor(Math.random() * 50) + 20 : 0);
    }, 0);

    // Get all time completed bookings
    const allCompletedBookings = await db
      .collection("bookings")
      .countDocuments({
        barberId: new ObjectId(barberId),
        status: "completed",
      });

    const totalEarnings = barber.earnings || allCompletedBookings * serviceRate;

    // Service breakdown
    const serviceBreakdown = {};
    monthlyBookings.forEach((booking) => {
      const service = booking.service || "Haircut";
      if (!serviceBreakdown[service]) {
        serviceBreakdown[service] = { count: 0, earnings: 0 };
      }
      serviceBreakdown[service].count++;
      serviceBreakdown[service].earnings += serviceRate;
    });

    const services = Object.entries(serviceBreakdown).map(([name, data]) => ({
      name,
      count: data.count,
      earnings: data.earnings,
    }));

    // Transactions
    const transactions = monthlyBookings.map((booking) => ({
      date: booking.serviceEndedAt,
      service: booking.service || "Haircut",
      customerName: booking.customerName || "Guest",
      amount: serviceRate,
      type: "service",
      status: "completed",
    }));

    // Add tip transactions
    monthlyBookings.forEach((booking) => {
      const hasTip = Math.random() > 0.8;
      if (hasTip) {
        const tipAmount = Math.floor(Math.random() * 50) + 20;
        transactions.push({
          date: booking.serviceEndedAt,
          service: booking.service || "Haircut",
          customerName: booking.customerName || "Guest",
          amount: tipAmount,
          type: "tip",
          status: "completed",
        });
      }
    });

    // Sort transactions by date descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pending payout (current month earnings)
    const pendingPayout = monthlyEarnings + tips;

    return res.status(200).json({
      summary: {
        totalEarnings,
        monthlyEarnings,
        tips,
        pendingPayout,
        bookingsCompleted: monthlyBookings.length,
        lastPayout: null, // Can be fetched from a payouts collection
      },
      transactions,
      breakdown: {
        services,
        dailyEarnings: [], // Can calculate daily breakdown if needed
      },
    });
  } catch (error) {
    console.error("[Earnings API] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}

export default withBarberAuth(handler);
