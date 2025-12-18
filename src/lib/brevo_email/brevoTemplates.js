export const otpEmailTemplate = (userName, otp) => ({
  subject: "Verify Your TechTrims Account - OTP",
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background: white; border: 1px solid #ddd;">
        <div style="background: #667eea; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">TechTrims</h1>
        </div>
        
        <div style="padding: 30px;">
          <p style="font-size: 16px;">Hello ${userName},</p>
          
          <p style="font-size: 16px;">Your verification code is:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; padding: 20px 40px; background: #f5f5f5; border-radius: 8px; border: 2px solid #667eea;">
              <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px;">${otp}</span>
            </div>
          </div>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>Important:</strong> This code expires in 10 minutes and can only be used once.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 25px;">
            If you didn't request this verification code, please ignore this email.
          </p>
          
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            Best regards,<br>
            <strong>TechTrims Team</strong>
          </p>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
          <p style="margin: 0; font-size: 12px; color: #999;">
            © ${new Date().getFullYear()} TechTrims. All rights reserved.
          </p>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #999;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,
  textContent: `Hello ${userName},\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nTechTrims Team`,
});

export const confirmationEmailTemplate = (userName, loginLink) => ({
  subject: "Welcome to TechTrims! Account Confirmed",
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background: white; border: 1px solid #ddd;">
        <div style="background: #10b981; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✓ Account Verified!</h1>
        </div>
        
        <div style="padding: 30px;">
          <p style="font-size: 16px;">Hello ${userName},</p>
          
          <p style="font-size: 16px;">Your TechTrims account has been successfully verified! 🎉</p>
          
          <p style="font-size: 16px;">You can now:</p>
          <ul style="font-size: 16px; color: #555;">
            <li>Book salon appointments</li>
            <li>Track your bookings in real-time</li>
            <li>Manage your profile</li>
            <li>Receive exclusive offers</li>
          </ul>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${loginLink}" style="display: inline-block; padding: 14px 32px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
              Login to Dashboard
            </a>
          </p>
          
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            Best regards,<br>
            <strong>TechTrims Team</strong>
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
  textContent: `Hello ${userName},\n\nYour TechTrims account has been successfully verified!\n\nLogin here: ${loginLink}\n\nBest regards,\nTechTrims Team`,
});
