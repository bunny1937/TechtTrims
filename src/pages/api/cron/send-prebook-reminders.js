import clientPromise from "../../../lib/mongodb";
import { brevoClient } from "../../../lib/brevo_email/brevoConfig";
import { ObjectId } from "mongodb";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  // Verify cron authorization
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("techtrims");
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Find prebooks that need 2-hour reminders
    const prebooks = await db
      .collection("bookings")
      .find({
        bookingType: "PREBOOK",
        reminderSentAt: null,
        scheduledFor: {
          $gte: now,
          $lte: twoHoursFromNow,
        },
        status: { $ne: "cancelled" },
        customerEmail: { $ne: null },
      })
      .toArray();

    console.log(
      `[Prebook Reminders] Found ${prebooks.length} bookings needing reminders`,
    );

    let successCount = 0;
    let failedCount = 0;

    for (const booking of prebooks) {
      try {
        const scheduledTime = new Date(booking.scheduledFor);
        const oneHourBefore = new Date(
          scheduledTime.getTime() - 60 * 60 * 1000,
        );

        // Format date and time
        const formattedDate = scheduledTime.toLocaleDateString("en-IN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const formattedTime = booking.time;

        // Google Calendar link
        const calendarStartTime =
          scheduledTime.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        const calendarEndTime =
          new Date(scheduledTime.getTime() + 60 * 60 * 1000)
            .toISOString()
            .replace(/[-:]/g, "")
            .split(".")[0] + "Z";

        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=TechTrims+Appointment+-+${encodeURIComponent(
          booking.service,
        )}&dates=${calendarStartTime}/${calendarEndTime}&details=Service:+${encodeURIComponent(
          booking.service,
        )}+at+${encodeURIComponent(booking.salonName)}&location=${encodeURIComponent(
          booking.salonName,
        )}`;

        // Confirmation page link
        const confirmationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://techtrims.vercel.app"}/prebook/confirmation?bookingId=${booking._id}`;

        // Send email via Brevo
        const emailPayload = {
          sender: {
            name: process.env.BREVO_SENDER_NAME || "TechTrims",
            email: process.env.BREVO_SENDER_EMAIL,
          },
          to: [
            {
              email: booking.customerEmail,
              name: booking.customerName,
            },
          ],
          subject: `⏰ Reminder: Your TechTrims Appointment at ${formattedTime}`,
          htmlContent: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 30px 20px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { padding: 30px 20px; }
                .content h2 { color: #333; margin-top: 0; }
                .booking-details { background: #f9f9f9; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
                .booking-details p { margin: 8px 0; color: #555; font-size: 15px; }
                .booking-details strong { color: #333; }
                .button { display: inline-block; background: #667eea; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 5px; font-weight: bold; margin: 10px 5px; }
                .button:hover { background: #5568d3; }
                .calendar-button { background: #34a853; }
                .calendar-button:hover { background: #2d8e47; }
                .footer { background: #f9f9f9; padding: 20px; text-align: center; color: #777; font-size: 13px; }
                .footer a { color: #667eea; text-decoration: none; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>⏰ Appointment Reminder</h1>
                </div>
                <div class="content">
                  <h2>Hi ${booking.customerName},</h2>
                  <p>This is a friendly reminder about your upcoming appointment at <strong>${booking.salonName}</strong>.</p>
                  
                  <div class="booking-details">
                    <p><strong>📅 Date:</strong> ${formattedDate}</p>
                    <p><strong>🕐 Time:</strong> ${formattedTime}</p>
                    <p><strong>✂️ Service:</strong> ${booking.service}</p>
                    <p><strong>💈 Barber:</strong> ${booking.barber}</p>
                    <p><strong>🎫 Booking Code:</strong> ${booking.bookingCode}</p>
                    <p><strong>💰 Price:</strong> ₹${booking.price}</p>
                  </div>

                  <p style="margin-top: 25px;">
                    <strong>Important:</strong> You will appear in the priority queue <strong>1 hour before</strong> your scheduled time (at ${oneHourBefore.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}).
                  </p>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${confirmationUrl}" class="button">View Booking Details</a>
                    <a href="${googleCalendarUrl}" class="button calendar-button">Add to Google Calendar</a>
                  </div>

                  <p style="color: #777; font-size: 14px; margin-top: 30px;">
                    Please arrive on time to ensure smooth service. You can track your queue position in real-time through the booking details page.
                  </p>
                </div>
                <div class="footer">
                  <p>This is an automated reminder from TechTrims</p>
                  <p>Need help? Contact us at <a href="mailto:${process.env.BREVO_SENDER_EMAIL}">${process.env.BREVO_SENDER_EMAIL}</a></p>
                </div>
              </div>
            </body>
            </html>
          `,
        };

        await brevoClient.sendTransacEmail(emailPayload);

        // Mark reminder as sent and activate in priority queue
        await db.collection("bookings").updateOne(
          { _id: booking._id },
          {
            $set: {
              reminderSentAt: now,
              queueStatus: "RED", // Move to priority queue with RED status
              priorityQueueActivatedAt: now,
            },
          },
        );

        successCount++;
        console.log(
          `[Prebook Reminder] Sent to ${booking.customerEmail} for booking ${booking._id}`,
        );
      } catch (error) {
        failedCount++;
        console.error(
          `[Prebook Reminder Failed] Booking ${booking._id}:`,
          error.message,
        );
      }
    }

    res.status(200).json({
      success: true,
      processed: prebooks.length,
      successCount,
      failedCount,
      timestamp: now.toISOString(),
      message: "Reminders sent successfully",
    });
  } catch (error) {
    console.error("[Prebook Cron Error]:", error);
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
}
// ✅ ADD THIS - Wraps your handler with QStash signature verification
export default verifySignatureAppRouter(handler);

export const config = {
  api: {
    bodyParser: false, // Required for QStash signature verification
  },
};
