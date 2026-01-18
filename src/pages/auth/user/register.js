// src/pages/auth/user/register.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../../styles/Auth/UserAuth.module.css";
import { showError, showSuccess } from "../../../lib/toast";

export default function UserRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    password: "",
    confirmPassword: "",
  });

  // OTP STATES
  const [step, setStep] = useState(1); // 1 = Register, 2 = Verify OTP
  const [otp, setOtp] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [csrfToken, setCsrfToken] = useState(""); // ← ADDED
  const [registeredEmail, setRegisteredEmail] = useState(""); // ← ADDED
  const [isResending, setIsResending] = useState(false); // ← ADDED

  const [prefillData, setPrefillData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    // Prefill logic from previous code
    const savedPrefillData = localStorage.getItem("userPrefillData");
    if (savedPrefillData) {
      try {
        const data = JSON.parse(savedPrefillData);
        const prefillInfo = {
          name: data.name || data.customerName,
          phone: data.phone || data.phoneNumber || data.customerPhone,
          gender: data.gender || data.customerGender,
          source: "feedback",
        };
        setPrefillData(prefillInfo);
        setFormData((prev) => ({
          ...prev,
          name: prefillInfo.name || prev.name,
          phone: prefillInfo.phone || prev.phone,
          gender: prefillInfo.gender || prev.gender,
        }));
      } catch (error) {
        console.error("Error parsing prefill data:", error);
      }
    }
  }, []);

  // CHECK PASSWORD REQUIREMENTS IN REAL-TIME
  useEffect(() => {
    const password = formData.password;
    setPasswordRequirements({
      minLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[!@#$%^&*]/.test(password),
    });
  }, [formData.password]);

  // CHECK IF PASSWORDS MATCH
  useEffect(() => {
    if (formData.confirmPassword === "") {
      setPasswordsMatch(null);
    } else if (formData.password === formData.confirmPassword) {
      setPasswordsMatch(true);
    } else {
      setPasswordsMatch(false);
    }
  }, [formData.password, formData.confirmPassword]);

  useEffect(() => {
    if (step === 2) {
      // Enable resend after 30 seconds
      const resendTimer = setTimeout(() => {
        setCanResend(true);
      }, 30000);

      return () => clearTimeout(resendTimer);
    }
  }, [step]);

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  // ADD THIS useEffect AFTER YOUR EXISTING useEffects (around line 80-100)

  useEffect(() => {
    // Check if redirected from login for verification
    const verificationData = localStorage.getItem("verificationData");
    if (verificationData) {
      try {
        const data = JSON.parse(verificationData);

        if (data.step === 2 && data.email && data.csrfToken) {
          // Set states to show OTP verification step
          setStep(2);
          setRegisteredEmail(data.email);
          setCsrfToken(data.csrfToken);
          setOtpTimer(600);
          setCanResend(false);

          showSuccess("Verification email sent! Please enter OTP.");

          // Clear localStorage
          localStorage.removeItem("verificationData");
        }
      } catch (error) {
        console.error("Error parsing verification data:", error);
      }
    }
  }, []);

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Final validation
    if (!allRequirementsMet) {
      showError("Password does not meet all requirements");
      return;
    }

    if (passwordsMatch !== true) {
      showError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const registrationData = {
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        password: formData.password,
      };

      const response = await fetch("/api/auth/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationData),
      });

      if (response.ok) {
        const result = await response.json();

        if (result.requiresVerification) {
          console.log("📦 Registration response:", result); // ← ADD THIS
          console.log("🔑 CSRF Token received:", result.csrfToken); // ← ADD THIS

          // ← SAVE CSRF TOKEN AND EMAIL
          setCsrfToken(result.csrfToken);
          setRegisteredEmail(result.email);

          console.log("💾 Saved csrfToken:", result.csrfToken); // ← ADD THIS
          console.log("💾 Saved email:", result.email); // ← ADD THIS

          showSuccess("OTP sent to your email! Please verify.");
          setStep(2);
          setOtpTimer(600);
          setCanResend(false);
          return;
        }

        localStorage.removeItem("userPrefillData");
        router.push("/user/dashboard");
      } else {
        const error = await response.json();
        showError(error.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      showError("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setOtpError("");

    console.log("🔍 OTP Submit - Email:", registeredEmail); // ← ADD THIS
    console.log("🔍 OTP Submit - CSRF:", csrfToken); // ← ADD THIS
    console.log("🔍 OTP Submit - OTP:", otp); // ← ADD THIS

    try {
      const payload = {
        email: registeredEmail,
        otp: otp.trim(),
        csrfToken: csrfToken,
      };

      console.log("📤 Sending payload:", payload); // ← ADD THIS

      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("📥 Response:", data); // ← ADD THIS

      if (response.ok) {
        showSuccess("Email verified successfully!");
        setTimeout(() => router.push("/auth/login"), 1500);
      } else {
        setOtpError(data.message || "Invalid OTP");
      }
    } catch (err) {
      setOtpError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    console.log("🔄 Resend OTP clicked");
    console.log("Registered email:", registeredEmail);

    if (!registeredEmail) {
      showError("Email not found. Please register again.");
      return;
    }

    setIsResending(true);
    setCanResend(false);
    setOtpError("");

    try {
      console.log("📤 Sending resend request...");

      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });

      const data = await response.json();

      console.log("📥 Resend response:", data);

      if (response.ok) {
        // ✅ UPDATE CSRF TOKEN IF PROVIDED
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
          console.log("🔑 Updated CSRF token:", data.csrfToken);
        }

        showSuccess(data.message || "OTP resent successfully!");
        setOtpTimer(600);
        setOtp("");
      } else {
        showError(data.message || "Failed to resend OTP");
        setCanResend(true);
      }
    } catch (error) {
      console.error("❌ Resend error:", error);
      showError("Failed to resend OTP");
      setCanResend(true);
    } finally {
      setIsResending(false);
    }
  };

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

        <h1 className={styles.title}>Create Account</h1>

        {/* STEP ROADMAP */}
        <div className={styles.stepRoadmap}>
          <div
            className={`${styles.stepItem} ${
              step === 1 ? styles.activeStep : ""
            }`}
          >
            <span className={styles.stepCircle}>1</span>
            <span>Create Account</span>
          </div>

          <div className={styles.stepLine}></div>

          <div
            className={`${styles.stepItem} ${
              step === 2 ? styles.activeStep : ""
            }`}
          >
            <span className={styles.stepCircle}>2</span>
            <span>Verify Email</span>
          </div>
        </div>

        {prefillData && (
          <div className={styles.prefillInfo}>
            <h3>✨ Complete your registration</h3>
            <p>
              {prefillData.source === "onboarding"
                ? "Based on your preferences"
                : "From your recent booking"}
            </p>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* NAME */}
            <div className={styles.formGroup}>
              <label htmlFor="name">Full Name *</label>
              <input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                disabled={isLoading}
                minLength={3}
              />
            </div>

            {/* EMAIL */}
            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address *</label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            {/* PHONE */}
            <div className={styles.formGroup}>
              <label htmlFor="phone">Phone Number *</label>
              <input
                id="phone"
                type="tel"
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
                disabled={isLoading}
                maxLength={10}
                pattern="[6-9][0-9]{9}"
              />
            </div>

            {/* GENDER */}
            <div className={styles.formGroup}>
              <label htmlFor="gender">Gender *</label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
                required
                disabled={isLoading}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* PASSWORD WITH REQUIREMENTS */}
            <div className={styles.formGroup}>
              <label htmlFor="password">Password *</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  disabled={isLoading}
                  className={`${styles.passwordInput} ${
                    allRequirementsMet && formData.password
                      ? styles.inputValid
                      : ""
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

              {/* PASSWORD REQUIREMENTS - SHOW/HIDE DYNAMICALLY */}
              {formData.password && (
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
                    character (!@#$%^&*)
                  </div>
                </div>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                  disabled={isLoading}
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
              {formData.confirmPassword && (
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
                      <span className={styles.matchIcon}>✗</span> Passwords
                      don&apos;t match
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={
                isLoading || !allRequirementsMet || passwordsMatch !== true
              }
            >
              {isLoading ? (
                <>
                  <span className={styles.spinner}></span> Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        )}

        {step === 2 && (
          <div className={styles.otpCard}>
            <h2>Verify Your Email</h2>
            <p>
              We sent a 6-digit OTP to <strong>{registeredEmail}</strong>
            </p>

            {otpError && <p className={styles.error}>{otpError}</p>}

            <form onSubmit={handleOtpSubmit} className={styles.form}>
              <input
                type="text"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                maxLength={6}
                placeholder="Enter OTP"
                className={styles.otpInput}
                autoFocus
              />

              {otpTimer > 0 ? (
                <p>
                  OTP expires in: {Math.floor(otpTimer / 60)}:
                  {(otpTimer % 60).toString().padStart(2, "0")}
                </p>
              ) : (
                <p className={styles.expired}>OTP expired</p>
              )}

              <button
                type="submit"
                disabled={otp.length !== 6 || isLoading}
                className={styles.submitButton}
              >
                {isLoading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                console.log("🖱️ Resend button clicked!"); // ← ADD THIS
                handleResendOtp();
              }}
              disabled={!canResend || isResending}
              className={styles.linkButton}
              style={{ opacity: !canResend || isResending ? 0.5 : 1 }} // ← ADD THIS to see if disabled
            >
              {isResending ? "Resending..." : "Resend OTP"}
              {!canResend && " (wait for timer)"}
            </button>
          </div>
        )}
        <p className={styles.authLink}>
          Already have an account?{" "}
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
  );
}
