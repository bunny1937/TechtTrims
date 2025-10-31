import clientPromise from "../../../../lib/mongodb";
import { withAdminAuth } from "../../../../lib/middleware/withAdminAuth";
import {
  logAdminAction,
  AuditActions,
  getClientIP,
} from "../../../../lib/auditLogger";

async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ message: "Method not allowed" });

  if (!req.admin || !req.admin.adminId) {
    return res.status(401).json({ message: "Admin authentication required" });
  }

  try {
    const { adminId, username } = req.admin;
    const {
      action,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    console.log("[AUDITLOG] Attempt insert", {
      adminId,
      username,
      action,
      timestamp: new Date(),
    });

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Build MongoDB filter for audit logs with trim checks on strings
    const filter = {};
    if (action && action.trim() !== "") filter.action = action.trim();
    if (status && status.trim() !== "") filter.status = status.trim();
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Fetch logs with pagination
    const logs = await db
      .collection("auditlogs")
      .find(filter)
      .sort({ timestamp: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .toArray();
    console.log({ filter, logs }); // Debug logs

    const total = await db.collection("auditlogs").countDocuments(filter);

    // Meta-logging the audit log access
    await logAdminAction(
      adminId,
      username,
      AuditActions.VIEW_AUDIT_LOGS,
      "AuditLog",
      null,
      { filters: filter, resultsCount: logs.length, timestamp: new Date() },
      getClientIP(req),
      req.headers["user-agent"],
      "SUCCESS"
    );

    return res.status(200).json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Audit Logs API error:", error.message, error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
}

export default withAdminAuth(handler);
