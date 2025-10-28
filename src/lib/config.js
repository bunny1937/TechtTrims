// src/lib/config.js - COMPLETE REPLACEMENT

const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET", "NEXT_PUBLIC_BASE_URL"];

// Validate on startup
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

// Validate JWT secret strength
if (process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long");
}

export const config = {
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV || "development",

  // Security settings
  bcryptRounds: 12,
  jwtExpiry: "7d",
  sessionExpiry: 24 * 60 * 60 * 1000, // 24 hours
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
};

export const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return config.baseUrl;
};
