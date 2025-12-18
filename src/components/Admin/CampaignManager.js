import { useState } from "react";
import styles from "../../styles/Admin/CampaignManager.module.css";
import { showSuccess, showError, showWarning } from "../../lib/toast";

export default function CampaignManager() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [campaignData, setCampaignData] = useState({
    subject: "",
    htmlContent: "",
    listIds: [2], // Your Brevo list ID
  });

  const handleSyncContacts = async () => {
    if (
      !confirm("Sync all verified users to Brevo? This may take a few minutes.")
    ) {
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch("/api/admin/contacts/sync", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess(`${data.stats.synced} contacts synced successfully!`);
      } else {
        showError(data.message || "Failed to sync contacts");
      }
    } catch (error) {
      showError("Network error while syncing contacts");
    } finally {
      setSyncing(false);
    }
  };

  const handleSendCampaign = async (e) => {
    e.preventDefault();

    if (!campaignData.subject || !campaignData.htmlContent) {
      showWarning("Please fill in subject and content");
      return;
    }

    if (!confirm(`Send campaign "${campaignData.subject}" to all contacts?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(campaignData),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess("Campaign sent successfully!");
        setCampaignData({
          subject: "",
          htmlContent: "",
          listIds: [2],
        });
      } else {
        showError(data.message || "Failed to send campaign");
      }
    } catch (error) {
      showError("Network error while sending campaign");
    } finally {
      setLoading(false);
    }
  };

  const appyTemplate = (template) => {
    if (template === "welcome") {
      setCampaignData({
        ...campaignData,
        subject: "🎉 Welcome to TechTrims - Special Offer Inside!",
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to TechTrims! 🎉</h1>
    </div>
    
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333;">Hi there,</p>
      
      <p style="font-size: 16px; color: #555;">
        Thank you for joining TechTrims! We're excited to have you with us.
      </p>
      
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
    </div>
    
    <div style="background: #f5f5f5; padding: 20px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #999;">
        © ${new Date().getFullYear()} TechTrims. All rights reserved.
      </p>
      <p style="margin: 5px 0 0 0; font-size: 12px;">
        <a href="[UNSUBSCRIBE]" style="color: #667eea;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
        `,
      });
    } else if (template === "promotional") {
      setCampaignData({
        ...campaignData,
        subject: "💇 Limited Time Offer - 30% OFF All Services!",
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
    <div style="background: #ef4444; padding: 40px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 32px;">🔥 Flash Sale!</h1>
      <p style="color: white; font-size: 18px; margin: 10px 0 0 0;">Limited Time Only</p>
    </div>
    
    <div style="padding: 40px 30px; text-align: center;">
      <h2 style="color: #333; font-size: 24px; margin: 0 0 20px 0;">Get 30% OFF All Services</h2>
      
      <div style="background: #fef3c7; border: 2px dashed #f59e0b; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">Use Code:</p>
        <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: #f59e0b; letter-spacing: 4px;">SAVE30</p>
      </div>
      
      <p style="font-size: 16px; color: #666;">
        Valid for the next 48 hours only!
      </p>
      
      <p style="margin: 30px 0;">
        <a href="${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }" style="display: inline-block; padding: 16px 40px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: 600;">
          Book Now & Save
        </a>
      </p>
    </div>
    
    <div style="background: #f5f5f5; padding: 20px; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #999;">
        © ${new Date().getFullYear()} TechTrims. All rights reserved.
      </p>
      <p style="margin: 5px 0 0 0; font-size: 12px;">
        <a href="[UNSUBSCRIBE]" style="color: #667eea;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
        `,
      });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📧 Email Campaign Manager</h1>
        <button
          onClick={handleSyncContacts}
          disabled={syncing}
          className={styles.syncButton}
        >
          {syncing ? "🔄 Syncing..." : "🔄 Sync Contacts to Brevo"}
        </button>
      </div>

      <div className={styles.templateButtons}>
        <button
          onClick={() => appyTemplate("welcome")}
          className={styles.templateBtn}
        >
          📝 Use Welcome Template
        </button>
        <button
          onClick={() => appyTemplate("promotional")}
          className={styles.templateBtn}
        >
          🎯 Use Promotional Template
        </button>
      </div>

      <form onSubmit={handleSendCampaign} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="subject">Email Subject *</label>
          <input
            id="subject"
            type="text"
            placeholder="Enter email subject..."
            value={campaignData.subject}
            onChange={(e) =>
              setCampaignData({ ...campaignData, subject: e.target.value })
            }
            required
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="htmlContent">Email HTML Content *</label>
          <textarea
            id="htmlContent"
            placeholder="Paste your HTML email template here..."
            value={campaignData.htmlContent}
            onChange={(e) =>
              setCampaignData({ ...campaignData, htmlContent: e.target.value })
            }
            required
            disabled={loading}
            rows={15}
          />
          <small
            style={{
              color: "#666",
              fontSize: "12px",
              marginTop: "4px",
              display: "block",
            }}
          >
            Use [UNSUBSCRIBE] placeholder for unsubscribe link
          </small>
        </div>

        <div className={styles.formGroup}>
          <label>Preview</label>
          <div
            className={styles.preview}
            dangerouslySetInnerHTML={{ __html: campaignData.htmlContent }}
          />
        </div>

        <button
          type="submit"
          className={styles.sendButton}
          disabled={
            loading || !campaignData.subject || !campaignData.htmlContent
          }
        >
          {loading ? "📤 Sending..." : "📤 Send Campaign to All Users"}
        </button>
      </form>
    </div>
  );
}
