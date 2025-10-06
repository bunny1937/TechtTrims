import jwt from "jsonwebtoken";

export function verifyAdminToken(req) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return null;
  }
}
