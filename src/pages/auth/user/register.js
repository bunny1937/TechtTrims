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
        localStorage.removeItem("userPrefillData");
        showSuccess("Registration successful! Welcome to TechTrims!");
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
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <div className={styles.passwordInputWrapper}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
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
                    <span className={styles.matchIcon}>✓</span> Passwords match!
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

        <p className={styles.authLink}>
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/auth/user/login")}
            className={styles.linkButton}
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
}
