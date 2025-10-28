// lib/middleware/sanitize.js
import validator from "validator";

export const sanitizeInput = (data) => {
  if (typeof data === "string") {
    // Simple string sanitization without DOM parsing
    return data
      .trim()
      .replace(/[<>]/g, "") // Remove angle brackets
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, "") // Remove event handlers like onclick=
      .replace(/&lt;/g, "")
      .replace(/&gt;/g, "")
      .substring(0, 10000); // Max length protection
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeInput(item));
  }

  if (typeof data === "object" && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return data;
};

export const validateAndSanitize = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  next();
};

export const validateEmail = (email) => {
  return validator.isEmail(email) && email.length <= 254;
};

export const validatePhone = (phone) => {
  return /^[6-9]\d{9}$/.test(phone);
};

export const validateObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};
