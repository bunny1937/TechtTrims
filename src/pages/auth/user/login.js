import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../../styles/Auth/UserAuth.module.css";
import { UserDataManager } from "../../../lib/userData";
import { setUserData } from "../../../lib/cookieAuth";
import { showSuccess, showError } from "../../../lib/toast";
import { Eye, EyeOff } from "lucide-react"; // Or use simple emoji

export default function UserLoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // NEW
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  useEffect(() => setMounted(true), []);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (response.status === 429) {
        setError(`Too many attempts. ${data.message}`);
      } else if (response.ok) {
        showSuccess(
          "Password reset link sent! Please check your email (including spam folder)."
        );
        setShowForgotPassword(false);
        setForgotEmail("");
      } else {
        setError(data.message || "Failed to send reset link");
      }
    } catch (error) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...formData, rememberMe }),
      });

      if (response.ok) {
        const result = await response.json();
        const userWithGender = {
          ...result.user,
          gender: result.user.gender || "other",
        };

        setUserData(userWithGender);
        sessionStorage.setItem("hasOnboarded", "true");
        await UserDataManager.fetchAndStoreUserData();

        showSuccess(`Welcome back, ${result.user.name}!`);
        router.push("/user/dashboard");
      } else {
        const error = await response.json();

        // ✅ CHECK FOR UNVERIFIED USER
        if (response.status === 403 && error.requiresVerification) {
          setUnverifiedEmail(error.email);
          setShowVerificationPrompt(true);
          setError(error.message);
        } else {
          setError(error.message || "Login failed");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ADD NEW HANDLER FOR RESEND VERIFICATION
  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess("Verification email sent! Redirecting...");

        // Store verification data in localStorage
        localStorage.setItem(
          "verificationData",
          JSON.stringify({
            email: unverifiedEmail,
            csrfToken: data.csrfToken,
            step: 2, // Go directly to OTP step
          })
        );

        // Redirect to register page (it will show OTP step)
        setTimeout(() => {
          router.push("/auth/user/register");
        }, 1000);
      } else {
        showError(data.message || "Failed to send verification email");
      }
    } catch (error) {
      showError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className={styles.container}>
        <div className={styles.authCard}>
          <div className={styles.header}>
            <button className={styles.backButton}>← Back to Home</button>
          </div>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.header}>
          <button
            onClick={() => router.push("/")}
            className={styles.backButton}
          >
            ← Back to Home
          </button>
        </div>

        {!showForgotPassword ? (
          <>
            <h1 className={styles.title}>Welcome Back</h1>
            <p className={styles.subtitle}>Login to your TechTrims account</p>

            {error && (
              <div className={styles.error}>
                <span>⚠️ {error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              {/* PASSWORD WITH TOGGLE */}
              <div className={styles.formGroup}>
                <label htmlFor="password">Password</label>
                <div className={styles.passwordInputWrapper}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className={styles.passwordInput}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggle}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                    {/* Or use: {showPassword ? <EyeOff size={20} /> : <Eye size={20} />} */}
                  </button>
                </div>
              </div>

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Keep me logged in for 30 days
              </label>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className={styles.spinner}></span> Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </form>
            {/* ✅ VERIFICATION PROMPT */}
            {showVerificationPrompt && (
              <div className={styles.verificationPrompt}>
                <p>Your email is not verified yet.</p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className={styles.resendButton}
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Resend Verification Email"}
                </button>
              </div>
            )}

            <div
              className={styles.authLink}
              style={{ marginTop: "1rem", textAlign: "center" }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setError("");
                }}
                className={styles.linkButton}
              >
                Forgot Password?
              </button>
            </div>

            <div className={styles.authLinks}>
              <div className={styles.authLink}>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/auth/user/register")}
                  className={styles.linkButton}
                >
                  Create Account
                </button>
              </div>

              <div className={styles.divider}>
                <span>or</span>
              </div>

              <div className={styles.authLink}>
                Are you a salon owner?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/auth/salon/login")}
                  className={styles.linkButton}
                >
                  Login as Salon
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Reset Password</h1>
            <p className={styles.subtitle}>
              Enter your email to receive a password reset link
            </p>

            {error && (
              <div className={styles.error}>
                <span>⚠️ {error}</span>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="forgotEmail">Email Address</label>
                <input
                  id="forgotEmail"
                  type="email"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className={styles.spinner}></span> Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>

            <div
              className={styles.authLink}
              style={{ marginTop: "1rem", textAlign: "center" }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotEmail("");
                  setError("");
                }}
                className={styles.linkButton}
              >
                ← Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
