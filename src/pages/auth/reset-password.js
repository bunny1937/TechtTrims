import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/Auth/UserAuth.module.css";
import { showSuccess, showError, showWarning } from "../../lib/toast";

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // PASSWORD VALIDATION STATE
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  const [passwordsMatch, setPasswordsMatch] = useState(null);

  // CHECK PASSWORD REQUIREMENTS IN REAL-TIME
  useEffect(() => {
    setPasswordRequirements({
      minLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[!@#$%^&*]/.test(password),
    });
  }, [password]);

  // CHECK IF PASSWORDS MATCH
  useEffect(() => {
    if (confirmPassword === "") {
      setPasswordsMatch(null);
    } else if (password === confirmPassword) {
      setPasswordsMatch(true);
    } else {
      setPasswordsMatch(false);
    }
  }, [password, confirmPassword]);

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      showError("Invalid reset link");
      return;
    }

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
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess("Password reset successfully! Redirecting to login...");
        setTimeout(() => router.push("/auth/login"), 2000);
      } else {
        // Handle specific error for password reuse
        if (data.code === "PASSWORD_REUSED") {
          showWarning(data.message);
        } else {
          showError(data.message || "Failed to reset password");
        }
      }
    } catch (error) {
      showError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>Create a strong new password</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* NEW PASSWORD */}
          <div className={styles.formGroup}>
            <label htmlFor="password">New Password *</label>
            <div className={styles.passwordInputWrapper}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className={`${styles.passwordInput} ${
                  allRequirementsMet && password ? styles.inputValid : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.passwordToggle}
                aria-label="Toggle password visibility"
                tabIndex={-1}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>

            {/* PASSWORD REQUIREMENTS */}
            {password && (
              <div className={styles.passwordRequirements}>
                <div
                  className={`${styles.requirement} ${
                    passwordRequirements.minLength ? styles.requirementMet : ""
                  }`}
                >
                  {passwordRequirements.minLength ? "✓" : "○"} At least 8
                  characters
                </div>
                <div
                  className={`${styles.requirement} ${
                    passwordRequirements.uppercase ? styles.requirementMet : ""
                  }`}
                >
                  {passwordRequirements.uppercase ? "✓" : "○"} One uppercase
                  letter (A-Z)
                </div>
                <div
                  className={`${styles.requirement} ${
                    passwordRequirements.lowercase ? styles.requirementMet : ""
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
                  character (!@#$%^&*)
                </div>
              </div>
            )}
          </div>

          {/* CONFIRM PASSWORD */}
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm New Password *</label>
            <div className={styles.passwordInputWrapper}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className={`${styles.passwordInput} ${
                  passwordsMatch === true ? styles.inputValid : ""
                } ${passwordsMatch === false ? styles.inputInvalid : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={styles.passwordToggle}
                aria-label="Toggle confirm password visibility"
                tabIndex={-1}
              >
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>

            {/* PASSWORD MATCH INDICATOR */}
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
                    <span className={styles.matchIcon}>✓</span> Passwords match!
                  </>
                ) : (
                  <>
                    <span className={styles.matchIcon}>✗</span> Passwords
                    don&lsquo;t match
                  </>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading || !allRequirementsMet || passwordsMatch !== true}
          >
            {loading ? (
              <>
                <span className={styles.spinner}></span> Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        <div className={styles.authLinks}>
          <p className={styles.authLink}>
            Remember your password?{" "}
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className={styles.linkButton}
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
