import { withAdminAuth } from "../../../../lib/middleware/withAdminAuth";
import { sendPromotionalEmail } from "../../../../lib/brevoMarketing";
import {
  logAdminAction,
  AuditActions,
  getClientIP,
} from "../../../../lib/auditLogger";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { adminId, username } = req.admin;
    const { subject, htmlContent, textContent, listIds } = req.body;

    if (!subject || !htmlContent || !listIds || listIds.length === 0) {
      return res.status(400).json({
        message: "Subject, content, and target list are required",
      });
    }

    // Send campaign via Brevo
    const result = await sendPromotionalEmail(
      listIds,
      subject,
      htmlContent,
      textContent || subject
    );

    if (!result.success) {
      await logAdminAction(
        adminId,
        username,
        "SEND_CAMPAIGN",
        "Campaign",
        null,
        { subject, listIds, error: result.error },
        getClientIP(req),
        req.headers["user-agent"],
        "FAILURE",
        result.error
      );

      return res.status(500).json({
        message: "Failed to send campaign",
        error: result.error,
      });
    }

    // Log success
    await logAdminAction(
      adminId,
      username,
      "SEND_CAMPAIGN",
      "Campaign",
      result.campaignId,
      { subject, listIds, campaignId: result.campaignId },
      getClientIP(req),
      req.headers["user-agent"],
      "SUCCESS"
    );

    return res.status(200).json({
      success: true,
      message: "Campaign sent successfully!",
      campaignId: result.campaignId,
    });
  } catch (error) {
    console.error("Campaign send error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

export default withAdminAuth(handler);
