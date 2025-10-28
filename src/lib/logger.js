// src/lib/logger.js - CREATE NEW FILE

const securityEvents = [];

export const logSecurityEvent = (event) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: event.type,
    severity: event.severity || "info",
    message: event.message,
    ip: event.ip,
    userId: event.userId,
    userAgent: event.userAgent,
    metadata: event.metadata,
  };

  // In production, send to logging service (e.g., Sentry, LogRocket)
  console.log("[SECURITY]", JSON.stringify(logEntry));

  // Store in memory (use database in production)
  securityEvents.push(logEntry);

  // Keep only last 1000 events
  if (securityEvents.length > 1000) {
    securityEvents.shift();
  }
};

export const logFailedLogin = (email, ip, reason) => {
  logSecurityEvent({
    type: "FAILED_LOGIN",
    severity: "warning",
    message: `Failed login attempt for ${email}`,
    ip,
    metadata: { email, reason },
  });
};

export const logSuspiciousActivity = (userId, activity, ip) => {
  logSecurityEvent({
    type: "SUSPICIOUS_ACTIVITY",
    severity: "high",
    message: `Suspicious activity detected: ${activity}`,
    userId,
    ip,
    metadata: { activity },
  });
};
