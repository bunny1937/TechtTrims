import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../../styles/Auth/UserAuth.module.css";
import { UserDataManager } from "../../../lib/userData";
import { setAuthToken, setUserData } from "../../../lib/cookieAuth";

export default function UserLoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false); // ✅ Add state

  // ✅ FIX: Wait for client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

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
        alert(
          "✅ Password reset link sent! Please check your email (including spam folder)."
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
        credentials: "include", // ✅ Include cookies
        body: JSON.stringify({ ...formData, rememberMe }),
      });

      if (response.ok) {
        const result = await response.json();
        // ✅ Don't call setAuthToken - backend sets HttpOnly cookie
        setUserData(result.user);

        // ✅ Mark as onboarded
        sessionStorage.setItem("hasOnboarded", "true");

        // Store non-sensitive data in sessionStorage
        await UserDataManager.fetchAndStoreUserData();

        alert(`Welcome back, ${result.user.name}!`);
        router.push("/user/dashboard");
      } else {
        const error = await response.json();
        setError(error.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FIX: Don't render until mounted on client
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

              <div className={styles.formGroup}>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
              <label>
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
                    <span className={styles.spinner}></span>
                    Logging in...
                  </>
                ) : (
                  "Login"
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
                Don&#39;t have an account?{" "}
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
                    <span className={styles.spinner}></span>
                    Sending...
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
