import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateToken = (userId, role, email) => {
  const accessToken = jwt.sign(
    {
      userId,
      role,
      email,
      type: "access",
      jti: crypto.randomBytes(16).toString("hex"), // Unique token ID
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m", // Short-lived access token
      issuer: "techtrims-api",
      audience: "techtrims-app",
    }
  );

  const refreshToken = jwt.sign(
    {
      userId,
      type: "refresh",
      jti: crypto.randomBytes(16).toString("hex"),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d", // Longer-lived refresh token
      issuer: "techtrims-api",
      audience: "techtrims-app",
    }
  );

  return { accessToken, refreshToken };
};

export const verifyToken = (token, type = "access") => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "techtrims-api",
      audience: "techtrims-app",
    });

    if (decoded.type !== type) {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return null;
  }
};

export const getLocationFromCoordinates = async (lat, lng) => {
  try {
    // Using reverse geocoding - you might want to use a proper service like Google Maps API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await response.json();
    return {
      address: data.display_name,
      city: data.address?.city || data.address?.town || data.address?.village,
      state: data.address?.state,
      country: data.address?.country,
      postcode: data.address?.postcode,
    };
  } catch (error) {
    console.error("Error getting location:", error);
    return null;
  }
};
