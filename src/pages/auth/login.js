// src/pages/auth/login.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { UserDataManager } from "../../lib/userData";
import { setUserData } from "../../lib/cookieAuth";
import { showSuccess, showError } from "../../lib/toast";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import styles from "../../styles/Auth/UserAuth.module.css";

export default function UnifiedLogin() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  useEffect(() => {
    setMounted(true);

    if (document.cookie.includes("userAuth=true")) {
      router.push("/user/dashboard");
    } else if (document.cookie.includes("salonAuth=true")) {
      router.push("/salons/dashboard");
    }
  }, [router]);

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

      if (response.ok) {
        showSuccess("Password reset link sent! Check your email.");
        setShowForgotPassword(false);
        setForgotEmail("");
      } else {
        setError(data.message || "Failed to send reset link");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // ✅ NO ROLE - backend auto-detects from email
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          identifier: formData.email,
          password: formData.password,
          rememberMe,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // ✅ Auto-redirect based on detected role
        if (data.role === "USER") {
          const userWithGender = {
            ...data.user,
            gender: data.user.gender || "other",
          };
          setUserData(userWithGender);
          sessionStorage.setItem("hasOnboarded", "true");
          await UserDataManager.fetchAndStoreUserData();
          showSuccess(`Welcome back, ${data.user.name}!`);
          router.push(data.redirectTo || "/user/dashboard");
        } else if (data.role === "SALON") {
          sessionStorage.setItem("salonSession", JSON.stringify(data.user));
          showSuccess(
            `Welcome back, ${data.user.salonName || data.user.name}!`,
          );
          router.push(data.redirectTo || "/salons/dashboard");
        }
      } else {
        const error = await response.json();

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
        localStorage.setItem(
          "verificationData",
          JSON.stringify({
            email: unverifiedEmail,
            csrfToken: data.csrfToken,
            step: 2,
          }),
        );
        setTimeout(() => router.push("/auth/user/register"), 1000);
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
          <p className={styles.subtitle}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        {/* Back to Home Button */}
        <button onClick={() => router.push("/")} className={styles.backButton}>
          <ArrowLeft size={16} />
          Back to Home
        </button>

        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Login to your TechTrims account</p>

        {showVerificationPrompt && (
          <div className={styles.verificationPrompt}>
            <p>Your email is not verified yet.</p>
            <button
              onClick={handleResendVerification}
              disabled={isLoading}
              className={styles.resendButton}
            >
              {isLoading ? "Sending..." : "Resend Verification Email"}
            </button>
          </div>
        )}

        {showForgotPassword ? (
          <form onSubmit={handleForgotPassword} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className={styles.error}>
                <span>⚠ {error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={styles.submitButton}
            >
              {isLoading && <span className={styles.spinner}></span>}
              {isLoading ? "Sending..." : "Send Reset Link"}
            </button>

            <div className={styles.authLinks}>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError("");
                }}
                className={styles.linkButton}
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Password</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className={styles.passwordInput}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className={styles.checkbox}>
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="rememberMe">Keep me logged in for 30 days</label>
            </div>

            {error && (
              <div className={styles.error}>
                <span>⚠ {error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={styles.submitButton}
            >
              {isLoading && <span className={styles.spinner}></span>}
              {isLoading ? "Logging in..." : "Login"}
            </button>

            <div className={styles.authLinks}>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className={styles.linkButton}
              >
                Forgot Password?
              </button>

              <div className={styles.divider}>
                <span>or</span>
              </div>

              <p className={styles.authLink}>
                Don&lsquo;t have an account? <br />
                <button
                  type="button"
                  onClick={() => router.push("/auth/user/register")}
                  className={styles.linkButton}
                >
                  Register as User
                </button>
                {" or "}
                <button
                  type="button"
                  onClick={() => router.push("/auth/salon/register")}
                  className={styles.linkButton}
                >
                  Register as Salon
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
