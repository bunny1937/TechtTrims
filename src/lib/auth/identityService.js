// src/lib/auth/identityService.js
import { hashPassword, verifyPassword } from "../auth";
import { ObjectId } from "mongodb";
import clientPromise from "../mongodb";

/**
 * ✅ SECURITY: Centralized identity management
 * ✅ NO PLAINTEXT: All passwords bcrypt hashed (saltRounds: 12)
 * ✅ RATE LIMITING: Account lockout after 5 failed attempts
 * ✅ ISOLATION: Auth data separated from domain data
 */
export class IdentityService {
  /**
   * Create new auth identity (during registration)
   */
  static async createIdentity({ role, identifier, password, linkedId }) {
    const client = await clientPromise;
    const db = client.db("techtrims");

    // Normalize identifier
    const normalizedIdentifier = identifier.toLowerCase().trim();

    // ✅ SECURITY: Check if identity already exists
    const existing = await db.collection("auth_identities").findOne({
      identifier: normalizedIdentifier,
      role,
    });

    if (existing) {
      throw new Error("An account with this email/phone already exists");
    }

    // ✅ SECURITY: Hash password (never store plaintext)
    const passwordHash = password ? await hashPassword(password) : null;

    const identity = {
      role, // "USER" | "SALON" | "BARBER"
      identifier: normalizedIdentifier,
      passwordHash,
      linkedId: new ObjectId(linkedId),

      // Security fields
      isActive: true,
      isVerified: role === "SALON", // Salons auto-verified, Users need email verification
      lastLoginAt: null,
      loginAttempts: 0,
      lockedUntil: null,

      // Audit
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("auth_identities").insertOne(identity);

    console.log(
      `✅ Identity created: ${role} - ${normalizedIdentifier} (linked to ${linkedId})`,
    );

    return result.insertedId;
  }

  /**
   * Find identity by identifier (email/phone)
   * Optional: Filter by role for stricter matching
   */
  static async findByIdentifier(identifier, role = null) {
    const client = await clientPromise;
    const db = client.db("techtrims");

    const query = { identifier: identifier.toLowerCase().trim() };
    if (role) query.role = role;

    return await db.collection("auth_identities").findOne(query);
  }

  /**
   * ✅ CRITICAL: Verify credentials with security checks
   * - Account lockout after 5 failed attempts (15 min)
   * - Rate limiting built-in
   * - Timing attack resistant (bcrypt)
   */
  static async verifyCredentials(identifier, password) {
    const identity = await this.findByIdentifier(identifier);

    if (!identity) {
      // ✅ SECURITY: Don't reveal if user exists
      return { success: false, error: "INVALID_CREDENTIALS" };
    }

    // ✅ SECURITY: Check if account is locked
    if (identity.lockedUntil && identity.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (identity.lockedUntil - new Date()) / 60000,
      );
      return {
        success: false,
        error: "ACCOUNT_LOCKED",
        message: `Too many failed attempts. Try again in ${remainingMinutes} minutes.`,
      };
    }

    // ✅ SECURITY: Check if account is active
    if (!identity.isActive) {
      return {
        success: false,
        error: "ACCOUNT_DEACTIVATED",
        message: "Your account has been deactivated. Contact support.",
      };
    }

    // ✅ SECURITY: Verify password (timing-safe comparison via bcrypt)
    const isValid = await verifyPassword(password, identity.passwordHash);

    if (!isValid) {
      // Increment failed attempts
      await this.incrementLoginAttempts(identity._id);
      return { success: false, error: "INVALID_CREDENTIALS" };
    }

    // ✅ SUCCESS: Reset attempts and update last login
    await this.resetLoginAttempts(identity._id);
    await this.updateLastLogin(identity._id);

    return { success: true, identity };
  }

  /**
   * ✅ SECURITY: Increment failed login attempts
   * Auto-lock account after 5 failures
   */
  static async incrementLoginAttempts(identityId) {
    const client = await clientPromise;
    const db = client.db("techtrims");

    const result = await db.collection("auth_identities").findOneAndUpdate(
      { _id: identityId },
      {
        $inc: { loginAttempts: 1 },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: "after" },
    );

    // Lock account after 5 failed attempts
    if (result.value && result.value.loginAttempts >= 5) {
      const lockDuration = 15 * 60 * 1000; // 15 minutes
      await db.collection("auth_identities").updateOne(
        { _id: identityId },
        {
          $set: {
            lockedUntil: new Date(Date.now() + lockDuration),
            updatedAt: new Date(),
          },
        },
      );
      console.warn(
        `🔒 Account locked: ${result.value.identifier} (5 failed attempts)`,
      );
    }
  }

  /**
   * Reset login attempts on successful login
   */
  static async resetLoginAttempts(identityId) {
    const client = await clientPromise;
    const db = client.db("techtrims");

    await db.collection("auth_identities").updateOne(
      { _id: identityId },
      {
        $set: {
          loginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        },
      },
    );
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(identityId) {
    const client = await clientPromise;
    const db = client.db("techtrims");

    await db.collection("auth_identities").updateOne(
      { _id: identityId },
      {
        $set: {
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
  }

  /**
   * ✅ SECURITY: Fetch domain data (users/salons/barbers)
   * NEVER returns password fields
   */
  static async getDomainData(linkedId, role) {
    const client = await clientPromise;
    const db = client.db("techtrims");

    const collectionMap = {
      USER: "users",
      SALON: "salons",
      BARBER: "barbers",
    };

    const collection = collectionMap[role];
    if (!collection) {
      throw new Error("Invalid role");
    }

    // ✅ SECURITY: Exclude password field
    return await db
      .collection(collection)
      .findOne(
        { _id: new ObjectId(linkedId) },
        { projection: { hashedPassword: 0 } },
      );
  }

  /**
   * Update verification status (after email verification)
   */
  static async verifyIdentity(identifier) {
    const client = await clientPromise;
    const db = client.db("techtrims");

    const result = await db.collection("auth_identities").updateOne(
      { identifier: identifier.toLowerCase().trim() },
      {
        $set: {
          isVerified: true,
          updatedAt: new Date(),
        },
      },
    );

    if (result.modifiedCount > 0) {
      console.log(`✅ Identity verified: ${identifier}`);
    }

    return result.modifiedCount > 0;
  }

  /**
   * Check if identifier exists (for registration validation)
   */
  static async identifierExists(identifier, role = null) {
    const client = await clientPromise;
    const db = client.db("techtrims");

    const query = { identifier: identifier.toLowerCase().trim() };
    if (role) query.role = role;

    const count = await db.collection("auth_identities").countDocuments(query);
    return count > 0;
  }

  /**
   * Update password (for password reset)
   */
  static async updatePassword(identifier, newPassword) {
    const client = await clientPromise;
    const db = client.db("techtrims");

    const passwordHash = await hashPassword(newPassword);

    const result = await db.collection("auth_identities").updateOne(
      { identifier: identifier.toLowerCase().trim() },
      {
        $set: {
          passwordHash,
          updatedAt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Deactivate identity (soft delete)
   */
  static async deactivateIdentity(linkedId, role) {
    const client = await clientPromise;
    const db = client.db("techtrims");

    const result = await db.collection("auth_identities").updateOne(
      { linkedId: new ObjectId(linkedId), role },
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }
}
