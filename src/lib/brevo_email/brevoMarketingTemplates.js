export const welcomeCampaignTemplate = (userName) => ({
  subject: "🎉 Welcome to TechTrims - Exclusive First Booking Offer!",
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to TechTrims! 🎉</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <p style="font-size: 18px; color: #333;">Hi ${
            userName || "there"
          },</p>
          
          <p style="font-size: 16px; color: #555;">
            Thank you for joining TechTrims! We're excited to have you with us.
          </p>
          
          <!-- Offer Box -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <h2 style="color: white; margin: 0 0 10px 0; font-size: 24px;">Special Welcome Offer</h2>
            <p style="color: white; font-size: 48px; font-weight: bold; margin: 10px 0;">20% OFF</p>
            <p style="color: white; font-size: 16px; margin: 0;">On your first booking!</p>
          </div>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${
              process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
            }" style="display: inline-block; padding: 16px 40px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: 600;">
              Book Now
            </a>
          </p>
          
          <h3 style="color: #333; font-size: 20px; margin-top: 40px;">What You Can Do:</h3>
          <ul style="font-size: 16px; color: #555; line-height: 1.8;">
            <li>🗓️ Book appointments instantly</li>
            <li>📍 Find nearby salons</li>
            <li>⏰ Real-time queue tracking</li>
            <li>💳 Secure online payments</li>
            <li>⭐ Rate your experience</li>
          </ul>
          
          <p style="font-size: 14px; color: #999; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            Questions? Reply to this email and we'll be happy to help!
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="margin: 0; font-size: 12px; color: #999;">
            © ${new Date().getFullYear()} TechTrims. All rights reserved.
          </p>
          <p style="margin: 5px 0 0 0; font-size: 12px;">
            <a href="[UNSUBSCRIBE]" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `,
  textContent: `Welcome to TechTrims!\n\nHi ${
    userName || "there"
  },\n\nThank you for joining TechTrims! Get 20% OFF on your first booking.\n\nBook now: ${
    process.env.NEXT_PUBLIC_BASE_URL
  }\n\nBest regards,\nTechTrims Team`,
});

export const bookingReminderTemplate = (userName, bookingDetails) => ({
  subject: `🔔 Reminder: Your appointment at ${bookingDetails.salonName} tomorrow`,
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0;">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background: white; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background: #10b981; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Appointment Reminder</h1>
        </div>
        
        <div style="padding: 30px;">
          <p style="font-size: 16px;">Hi ${userName},</p>
          
          <p style="font-size: 16px;">
            This is a friendly reminder about your upcoming appointment:
          </p>
          
          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px;"><strong>Salon:</strong> ${
              bookingDetails.salonName
            }</p>
            <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Date:</strong> ${
              bookingDetails.date
            }</p>
            <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Time:</strong> ${
              bookingDetails.time
            }</p>
            <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Service:</strong> ${
              bookingDetails.service
            }</p>
            <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Booking Code:</strong> ${
              bookingDetails.bookingCode
            }</p>
          </div>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/confirmation/${
    bookingDetails.bookingId
  }" style="display: inline-block; padding: 14px 32px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
              View Booking
            </a>
          </p>
          
          <p style="font-size: 14px; color: #666;">
            See you soon!
          </p>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
          <p style="margin: 0; font-size: 12px; color: #999;">
            © ${new Date().getFullYear()} TechTrims. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,
  textContent: `Appointment Reminder\n\nHi ${userName},\n\nYour appointment details:\nSalon: ${bookingDetails.salonName}\nDate: ${bookingDetails.date}\nTime: ${bookingDetails.time}\nService: ${bookingDetails.service}\n\nSee you soon!\n\nTechTrims Team`,
});
