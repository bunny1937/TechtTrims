// src/pages/auth/login.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { UserDataManager } from "../../../lib/userData";
import { setUserData } from "../../../lib/cookieAuth";
import { showSuccess, showError } from "../../../lib/toast";
import { Eye, EyeOff } from "lucide-react";
import userStyles from "../../../styles/Auth/UserAuth.module.css";
import salonStyles from "../../../styles/Auth/SalonAuth.module.css";

export default function UnifiedLogin() {
  const router = useRouter();
  const [role, setRole] = useState("USER");
  const styles = role === "USER" ? userStyles : salonStyles;

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

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (router.query.role) {
      const urlRole = router.query.role.toUpperCase();
      if (["USER", "SALON"].includes(urlRole)) setRole(urlRole);
    }
  }, [router.query.role]);

  useEffect(() => {
    if (!mounted) return;
    if (role === "USER") {
      if (document.cookie.includes("userAuth=true"))
        router.push("/user/dashboard");
    } else {
      const salonToken = localStorage.getItem("salonToken");
      const salonSession = localStorage.getItem("salonSession");
      if (salonToken || salonSession) router.push("/salons/dashboard");
    }
  }, [mounted, role, router]);

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
          "Password reset link sent! Please check your email (including spam folder).",
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
      if (role === "USER") {
        const response = await fetch("/api/auth/login", {
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
          if (response.status === 403 && error.requiresVerification) {
            setUnverifiedEmail(error.email);
            setShowVerificationPrompt(true);
            setError(error.message);
          } else {
            setError(error.message || "Login failed");
          }
        }
      } else {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (response.ok) {
          const data = await response.json();
          localStorage.setItem("salonToken", data.token);
          localStorage.setItem("salonSession", JSON.stringify(data.salon));
          showSuccess(`Welcome back, ${data.salon.salonName}!`);
          window.location.href = "/salons/dashboard";
        } else {
          const error = await response.json();
          showError(error.message || "Login failed");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      if (role === "USER") {
        setError("Network error. Please try again.");
      } else {
        showError("Login error: " + error.message);
      }
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
          <div className={styles.header}>
            <button className={styles.backButton}>← Back to Home</button>
          </div>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>Loading...</p>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
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
            </>
          ) : (
            <>
              <h1 className={styles.title}>Reset Password</h1>
              <p className={styles.subtitle}>
                Enter your email to receive a password reset link
              </p>
            </>
          )}
          {error && (
            <div className={styles.error}>
              <span>{error}</span>
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
        <h1 className={styles.title}>
          {role === "USER" ? "Welcome Back" : "Salon Login"}
        </h1>
        <p className={styles.subtitle}>
          {role === "USER"
            ? "Login to your TechTrims account"
            : "Login to manage your salon"}
        </p>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1.5rem",
            padding: "0.25rem",
            background: "rgba(212, 175, 55, 0.1)",
            borderRadius: "8px",
            border: "1px solid rgba(212, 175, 55, 0.2)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setRole("USER");
              setError("");
              setShowVerificationPrompt(false);
            }}
            style={{
              flex: 1,
              padding: "0.75rem",
              border: "none",
              borderRadius: "6px",
              background:
                role === "USER"
                  ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                  : "transparent",
              color: role === "USER" ? "#000" : "#666",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow:
                role === "USER" ? "0 4px 12px rgba(212, 175, 55, 0.3)" : "none",
            }}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => {
              setRole("SALON");
              setError("");
              setShowVerificationPrompt(false);
            }}
            style={{
              flex: 1,
              padding: "0.75rem",
              border: "none",
              borderRadius: "6px",
              background:
                role === "SALON"
                  ? "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
                  : "transparent",
              color: role === "SALON" ? "#000" : "#666",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow:
                role === "SALON"
                  ? "0 4px 12px rgba(212, 175, 55, 0.3)"
                  : "none",
            }}
          >
            Salon
          </button>
        </div>

        {error && (
          <div className={styles.error}>
            <span>{error}</span>
          </div>
        )}
        {showVerificationPrompt && role === "USER" && (
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
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          {role === "USER" && (
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Keep me logged in for 30 days
            </label>
          )}
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
              `Login as ${role === "USER" ? "Customer" : "Salon"}`
            )}
          </button>
        </form>

        {role === "USER" && (
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
        )}

        <div className={styles.authLinks}>
          <div className={styles.divider}>
            <span>or</span>
          </div>
          <div className={styles.authLink}>
            Don&lsquo;t have an account?{" "}
            <button
              type="button"
              onClick={() =>
                router.push(
                  role === "USER"
                    ? "/auth/user/register"
                    : "/auth/salon/register",
                )
              }
              className={styles.linkButton}
            >
              {role === "USER" ? "Sign up" : "Register here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
