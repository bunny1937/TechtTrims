// lib/auditLogger.js
import clientPromise from "./mongodb";
import { MongoClient } from "mongodb";

/**
 * Logs admin actions for compliance and security tracking
 * @param {Object} params - Audit log parameters
 */

export async function logAdminAction(
  adminId,
  adminUsername,
  action,
  resource = null,
  resourceId = null,
  details = {},
  ipAddress = null,
  userAgent = null,
  status = "SUCCESS",
  errorMessage = null
) {
  if (!action || typeof action !== "string" || action.trim() === "") {
    action = "UNKNOWN_ACTION";

    console.error("logAdminAction: invalid or empty action", {
      adminId,
      adminUsername,
    });
    return;
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db("techtrims");
    await db.collection("auditlogs").insertOne({
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
    });

    console.log("Audit log saved:", { adminId, action, timestamp: new Date() });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  } finally {
    await client.close();
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
