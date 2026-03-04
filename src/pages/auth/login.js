// src/pages/auth/login.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { UserDataManager } from "../../lib/userData";
import { setUserData } from "../../lib/cookieAuth";
import { showSuccess, showError } from "../../lib/toast";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import styles from "../../styles/Auth/UserAuth.module.css";
import Script from "next/script";

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
  const [showOtherLogins, setShowOtherLogins] = useState(false);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (document.cookie.includes("userAuth=true")) {
      router.push("/user/dashboard");
    } else if (document.cookie.includes("salonAuth=true")) {
      router.push("/salons/dashboard");
    } else if (document.cookie.includes("barberAuth=true")) {
      router.push("/barber/dashboard");
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

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        const googleBtn = document.getElementById("google-signin-btn");
        if (googleBtn) {
          window.google.accounts.id.renderButton(googleBtn, {
            theme: "outline",
            size: "large",
            text: "signin_with",
            width: 280,
          });
        }
      }
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // ✅ FIXED: Google Sign-In callback
  const handleGoogleCallback = async (response) => {
    if (!response.credential) {
      setError("Google login failed - no credential received");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const apiResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ CRITICAL
        body: JSON.stringify({
          method: "google",
          idToken: response.credential,
        }),
      });

      const data = await apiResponse.json();

      if (apiResponse.ok) {
        // ✅ CRITICAL: Store user data (SAME as email/password)

        // ✅ CRITICAL: Redirect (SAME as email/password)
        setTimeout(() => {
          window.location.href = data.redirectTo;
        }, 500);
      } else {
        setError(data.message || "Google login failed");
      }
    } catch (error) {
      console.error("❌ Google login error:", error);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  // ✅ CRITICAL FIX: Disable FedCM and use popup flow
  const initializeGoogleSignIn = () => {
    if (!window.google?.accounts?.id) {
      console.error("Google Sign-In library not loaded");
      return;
    }

    try {
      // 🔥 DISABLE FedCM - This is the key fix!
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: "popup", // 🔥 Force popup mode
        use_fedcm_for_prompt: false, // 🔥 Disable FedCM
      });

      const container = document.getElementById("google-btn");
      if (container) {
        window.google.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          width: 280,
          logo_alignment: "left",
        });
        console.log("✅ Google Sign-In button rendered");
      }
    } catch (error) {
      console.error("❌ Google Sign-In initialization error:", error);
    }
  };

  // ✅ Initialize when script loads
  useEffect(() => {
    if (googleScriptLoaded && mounted) {
      const timer = setTimeout(() => {
        initializeGoogleSignIn();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [googleScriptLoaded, mounted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const pendingGoogleLink = sessionStorage.getItem("pendingGoogleLink");
    let googleIdToken = null;

    if (pendingGoogleLink) {
      try {
        googleIdToken = JSON.parse(pendingGoogleLink).idToken;
      } catch {
        sessionStorage.removeItem("pendingGoogleLink");
      }
    }

    try {
      const response = await fetch(
        googleIdToken ? "/api/auth/login?linkGoogle=true" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            identifier: formData.email,
            password: formData.password,
            rememberMe,
            ...(googleIdToken && { googleIdToken }),
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();

        if (googleIdToken) {
          sessionStorage.removeItem("pendingGoogleLink");
          showSuccess("Google account linked successfully!");
        }

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
        } else if (data.user && data.role === "BARBER") {
          sessionStorage.setItem("hasOnboarded", "true");
          sessionStorage.setItem("barberSession", JSON.stringify(data.user));
          showSuccess(`Welcome back, ${data.user.name}!`);
          router.push("/barber/dashboard");
        }
      } else {
        const errorData = await response.json();

        if (response.status === 403 && errorData.requiresVerification) {
          setUnverifiedEmail(errorData.email);
          setShowVerificationPrompt(true);
          setError(errorData.message);
        } else {
          setError(errorData.message || "Login failed");
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
    <>
      {/* ✅ Load Google Sign-In script */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("✅ Google Sign-In script loaded");
          setGoogleScriptLoaded(true);
        }}
        onError={(e) => {
          console.error("❌ Failed to load Google Sign-In script:", e);
        }}
      />

      <div className={styles.container}>
        <div className={styles.authCard}>
          <button
            onClick={() => router.push("/")}
            className={styles.backButton}
          >
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
                  disabled={isLoading}
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
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggle}
                    disabled={isLoading}
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
                  disabled={isLoading}
                />
                <label htmlFor="rememberMe">
                  Keep me logged in for 30 days
                </label>
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

              {/* ✅ Google Sign-In Button Container */}
              <div
                id="google-btn"
                style={{
                  marginTop: "1rem",
                  display: "flex",
                  justifyContent: "center",
                  minHeight: "40px",
                }}
              />

              {/* <p
                className={styles.otherLoginText}
                onClick={() => setShowOtherLogins(true)}
                style={{ cursor: "pointer" }}
              >
                Other ways to login?
              </p> */}
              {/* {showOtherLogins && (
                <OtherLoginModal onClose={() => setShowOtherLogins(false)} />
              )} */}

              <div className={styles.authLinks}>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className={styles.linkButton}
                  disabled={isLoading}
                >
                  Forgot Password?
                </button>

                <div className={styles.divider}>
                  <span>or</span>
                </div>

                <p className={styles.authLink}>
                  Don&apos;t have an account? <br />
                  <button
                    type="button"
                    onClick={() => router.push("/auth/user/register")}
                    className={styles.linkButton}
                    disabled={isLoading}
                  >
                    Register as User
                  </button>
                  {" or "}
                  <button
                    type="button"
                    onClick={() => router.push("/auth/salon/register")}
                    className={styles.linkButton}
                    disabled={isLoading}
                  >
                    Register as Salon
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
