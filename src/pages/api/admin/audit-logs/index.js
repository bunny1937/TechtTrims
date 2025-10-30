import clientPromise from "../../../../lib/mongodb";
import { withAdminAuth } from "../../../../lib/middleware/withAdminAuth";
import { logAdminAction, AuditActions } from "../../../../lib/auditLogger";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      action,
      adminId,
      startDate,
      endDate,
      status,
      page = 1,
      limit = 50,
    } = req.query;

    const client = await clientPromise;
    const db = client.db("techtrims");

    // Build filter
    const filter = {};
    if (action) filter.action = action;
    if (adminId) filter.adminId = adminId;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    // Fetch logs
    const logs = await db
      .collection("audit_logs")
      .find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection("audit_logs").countDocuments(filter);

    // ✅ Log audit log access (meta-logging!)
    await logAdminAction({
      adminId: adminId,
      adminUsername: username,
      action: AuditActions.VIEW_AUDIT_LOGS,
      resource: "AuditLog",
      resourceId: null,
      details: {
        filters: filter,
        resultsCount: logs.length,
      },
      ipAddress: req.admin.getClientIP(),
      userAgent: req.admin.getUserAgent(),
      status: "SUCCESS",
    });

    res.status(200).json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fetch audit logs error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export default withAdminAuth(handler);
