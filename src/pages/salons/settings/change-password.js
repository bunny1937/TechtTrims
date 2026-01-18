// src/pages/salon/change-password.js

import { useState } from "react";
import { useRouter } from "next/router";
import OwnerSidebar from "@/components/OwnerSidebar";
import styles from "@/styles/Auth/UserAuth.module.css";
import { showSuccess, showError } from "@/lib/toast";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Password requirements
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  const [passwordsMatch, setPasswordsMatch] = useState(null);

  // Check requirements
  useState(() => {
    setPasswordRequirements({
      minLength: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    });
  }, [newPassword]);

  useState(() => {
    if (!confirmPassword) {
      setPasswordsMatch(null);
    } else if (newPassword === confirmPassword) {
      setPasswordsMatch(true);
    } else {
      setPasswordsMatch(false);
    }
  }, [newPassword, confirmPassword]);

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!allRequirementsMet) {
      showError("Password does not meet all requirements");
      return;
    }

    if (passwordsMatch !== true) {
      showError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const salonSession = localStorage.getItem("salonSession");
      if (!salonSession) {
        router.push("/auth/login");
        return;
      }

      const salonData = JSON.parse(salonSession);

      const res = await fetch("/api/salons/settings/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          salonId: salonData.id,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showSuccess("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => router.push("/salon/dashboard"), 2000);
      } else {
        showError(data.message || "Failed to change password");
      }
    } catch (error) {
      console.error(error);
      showError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex" }}>
      <OwnerSidebar />
      <div style={{ flex: 1, padding: "2rem", maxWidth: "600px" }}>
        <div className={styles.authCard}>
          <h1 className={styles.title}>Change Password</h1>
          <p className={styles.subtitle}>Update your salon account password</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Current Password */}
            <div className={styles.formGroup}>
              <label htmlFor="currentPassword">Current Password</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={loading}
                  className={styles.passwordInput}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className={styles.passwordToggle}
                  aria-label="Toggle current password visibility"
                  tabIndex={-1}
                >
                  {showCurrent ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className={styles.formGroup}>
              <label htmlFor="newPassword">New Password</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                  className={`${styles.passwordInput} ${
                    allRequirementsMet && newPassword ? styles.inputValid : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className={styles.passwordToggle}
                  aria-label="Toggle new password visibility"
                  tabIndex={-1}
                >
                  {showNew ? "🙈" : "👁️"}
                </button>
              </div>

              {/* Password Requirements */}
              {newPassword && (
                <div className={styles.passwordRequirements}>
                  <div
                    className={`${styles.requirement} ${
                      passwordRequirements.minLength
                        ? styles.requirementMet
                        : ""
                    }`}
                  >
                    {passwordRequirements.minLength ? "✓" : "○"} At least 8
                    characters
                  </div>
                  <div
                    className={`${styles.requirement} ${
                      passwordRequirements.uppercase
                        ? styles.requirementMet
                        : ""
                    }`}
                  >
                    {passwordRequirements.uppercase ? "✓" : "○"} One uppercase
                    letter (A-Z)
                  </div>
                  <div
                    className={`${styles.requirement} ${
                      passwordRequirements.lowercase
                        ? styles.requirementMet
                        : ""
                    }`}
                  >
                    {passwordRequirements.lowercase ? "✓" : "○"} One lowercase
                    letter (a-z)
                  </div>
                  <div
                    className={`${styles.requirement} ${
                      passwordRequirements.number ? styles.requirementMet : ""
                    }`}
                  >
                    {passwordRequirements.number ? "✓" : "○"} One number (0-9)
                  </div>
                  <div
                    className={`${styles.requirement} ${
                      passwordRequirements.specialChar
                        ? styles.requirementMet
                        : ""
                    }`}
                  >
                    {passwordRequirements.specialChar ? "✓" : "○"} One special
                    character (!@#$%...)
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className={`${styles.passwordInput} ${
                    passwordsMatch === true
                      ? styles.inputValid
                      : passwordsMatch === false
                        ? styles.inputInvalid
                        : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className={styles.passwordToggle}
                  aria-label="Toggle confirm password visibility"
                  tabIndex={-1}
                >
                  {showConfirm ? "🙈" : "👁️"}
                </button>
              </div>

              {/* Password Match Indicator */}
              {confirmPassword && (
                <div
                  className={`${styles.passwordMatch} ${
                    passwordsMatch === true
                      ? styles.passwordMatchSuccess
                      : styles.passwordMatchError
                  }`}
                >
                  {passwordsMatch === true ? (
                    <>
                      <span className={styles.matchIcon}>✓</span> Passwords
                      match!
                    </>
                  ) : (
                    <>
                      <span className={styles.matchIcon}>✕</span> Passwords
                      don&lsquo;t match
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={
                loading ||
                !allRequirementsMet ||
                passwordsMatch !== true ||
                !currentPassword
              }
            >
              {loading ? (
                <>
                  <span className={styles.spinner}></span> Updating...
                </>
              ) : (
                "Change Password"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
