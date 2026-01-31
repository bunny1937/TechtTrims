// lib/bookingCodeGenerator.js
import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";

/**
 * Generate booking code with salon-specific prefix
 * Format: XX-YYYYY
 * XX = Salon initials (first letters of first 2 words, or first 2 letters if 1 word)
 * YYYYY = Random 5-char code
 *
 * Handles duplicates: Singhania Trims -> SI-XXXXX, Sarvesh Trims -> SA-XXXXX
 */
export async function generateBookingCode(salonId) {
  try {
    const client = await clientPromise;
    const db = client.db("techtrims");

    // Get salon name
    const salon = await db.collection("salons").findOne({
      _id: new ObjectId(salonId),
    });

    if (!salon || !salon.salonName) {
      // Fallback if salon not found
      return generateRandomCode("ST"); // Default to 'ST'
    }

    // Generate prefix from salon name
    const prefix = generateSalonPrefix(salon.salonName);

    // Generate unique code
    let code;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = generateRandomCode(prefix);
      // Check if code already exists
      const existing = await db
        .collection("bookings")
        .findOne({ bookingCode: code });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      // Fallback: append timestamp
      code = `${prefix}-${Date.now().toString().slice(-5)}`;
    }

    return code;
  } catch (error) {
    console.error("Error generating booking code:", error);
    // Fallback: timestamp-based code
    return `BK-${Date.now().toString().slice(-5)}`;
  }
}

/**
 * Extract 2-letter prefix from salon name
 * Examples:
 * - "Singhania Trims" -> "SI" (first letter of each word)
 * - "Sarvesh Trims" -> "SA"
 * - "StyleHub" -> "ST" (first 2 letters)
 * - "The Great Salon" -> "TG" (skip 'The', use next 2 words)
 */
function generateSalonPrefix(salonName) {
  // Clean and split name
  const words = salonName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "") // Remove special chars
    .split(/\s+/)
    .filter((w) => w.length > 0 && !["THE", "A", "AN"].includes(w)); // Skip articles

  if (words.length >= 2) {
    // Take first letter of first 2 words
    return words[0][0] + words[1][0];
  } else if (words.length === 1 && words[0].length >= 2) {
    // Take first 2 letters of single word
    return words[0].substring(0, 2);
  } else {
    // Fallback
    return "BK"; // Generic "Booking"
  }
}

/**
 * Generate random alphanumeric code
 */
function generateRandomCode(prefix) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"; // Excluding I, O for clarity
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}
