// lib/auditLogger.js
import clientPromise from "./mongodb";

/**
 * Logs admin actions for compliance and security tracking
 * @param {Object} params - Audit log parameters
 */
export async function logAdminAction({
  adminId,
  adminUsername,
  action,
  resource = null,
  resourceId = null,
  details = {},
  ipAddress = null,
  userAgent = null,
  status = "SUCCESS",
  errorMessage = null,
}) {
  try {
    const client = await clientPromise;
    const db = client.db("techtrims");

    const auditLog = {
      adminId,
      adminUsername,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      status,
      errorMessage,
    };

    await db.collection("audit_logs").insertOne(auditLog);

    console.log(`✅ Audit: ${action} by ${adminUsername} - ${status}`);
  } catch (error) {
    // ⚠️ Never fail the main operation if logging fails
    console.error("❌ Audit logging failed:", error.message);
  }
}

/**
 * Helper to get client IP address
 */
export function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

/**
 * Action types enum
 */
export const AuditActions = {
  // Auth
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",

  // Salon Management
  CREATE_SALON: "CREATE_SALON",
  UPDATE_SALON: "UPDATE_SALON",
  DELETE_SALON: "DELETE_SALON",
  TOGGLE_SALON_STATUS: "TOGGLE_SALON_STATUS",

  // User Management
  VIEW_USERS: "VIEW_USERS",
  VIEW_USER_DETAILS: "VIEW_USER_DETAILS",
  DELETE_USER: "DELETE_USER",

  // Booking Management
  VIEW_BOOKINGS: "VIEW_BOOKINGS",
  CANCEL_BOOKING: "CANCEL_BOOKING",

  // Reports & Analytics
  GENERATE_REPORT: "GENERATE_REPORT",
  VIEW_REVENUE: "VIEW_REVENUE",
  VIEW_ANALYTICS: "VIEW_ANALYTICS",
  EXPORT_DATA: "EXPORT_DATA",

  // System
  VIEW_AUDIT_LOGS: "VIEW_AUDIT_LOGS",
};
