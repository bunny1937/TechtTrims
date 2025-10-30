// models/AuditLog.js
import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    // WHO
    adminId: {
      type: String,
      required: true,
      index: true,
    },
    adminUsername: {
      type: String,
      required: true,
    },

    // WHAT
    action: {
      type: String,
      required: true,
      enum: [
        "LOGIN",
        "LOGOUT",
        "CREATE_SALON",
        "UPDATE_SALON",
        "DELETE_SALON",
        "TOGGLE_SALON_STATUS",
        "VIEW_USERS",
        "VIEW_USER_DETAILS",
        "DELETE_USER",
        "VIEW_BOOKINGS",
        "CANCEL_BOOKING",
        "GENERATE_REPORT",
        "VIEW_REVENUE",
        "VIEW_ANALYTICS",
        "EXPORT_DATA",
        "VIEW_AUDIT_LOGS",
      ],
      index: true,
    },
    resource: {
      type: String,
      default: null,
    },
    resourceId: {
      type: String,
      default: null,
    },

    // DETAILS
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },

    // WHEN
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // OUTCOME
    status: {
      type: String,
      enum: ["SUCCESS", "FAILURE", "PARTIAL"],
      default: "SUCCESS",
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "audit_logs",
  }
);

// Compound indexes for common queries
AuditLogSchema.index({ adminId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ status: 1, timestamp: -1 });

export default mongoose.models.AuditLog ||
  mongoose.model("AuditLog", AuditLogSchema);
