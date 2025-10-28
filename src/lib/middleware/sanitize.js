// src/lib/middleware/sanitize.js - CREATE NEW FILE
import DOMPurify from "isomorphic-dompurify";
import validator from "validator";

export const sanitizeInput = (data) => {
  if (typeof data === "string") {
    // Remove script tags and dangerous HTML
    return DOMPurify.sanitize(data, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    }).trim();
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
  // Sanitize body
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }

  // Sanitize query params
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
