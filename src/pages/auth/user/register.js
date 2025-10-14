import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../../styles/Auth/UserAuth.module.css";

export default function UserRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    password: "",
  });
  const [prefillData, setPrefillData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for prefill data from feedback or onboarding
    const onboardingData = localStorage.getItem("userOnboardingData");
    const savedPrefillData = localStorage.getItem("userPrefillData");

    console.log("Checking localStorage data:");
    console.log("onboardingData:", onboardingData);
    console.log("savedPrefillData:", savedPrefillData);

    let prefillInfo = null;

    if (savedPrefillData) {
      try {
        const data = JSON.parse(savedPrefillData);
        console.log("Parsed prefill data:", data); // Debug log

        prefillInfo = {
          name: data.name || data.customerName,
          phone: data.phone || data.phoneNumber || data.customerPhone,
          phoneNumber: data.phoneNumber || data.phone || data.customerPhone,
          gender: data.gender || data.customerGender,
          age: data.age || data.customerAge || null,
          lastBooking: data.lastBookings,
          source: "feedback",
        };
        setPrefillData(prefillInfo);
        setFormData((prev) => ({
          ...prev,
          name: prefillInfo.name || prev.name,
          phone: prefillInfo.phoneNumber || prev.phone,
          age: prefillInfo.age || prev.age,
          gender: prefillInfo.gender || prev.gender,
        }));

        console.log("Form data after prefill:", {
          name: prefillInfo.name,
          phone: prefillInfo.phoneNumber,
          gender: prefillInfo.gender,
        });
      } catch (error) {
        console.error("Error parsing prefill data:", error);
      }
    } else if (onboardingData) {
      try {
        const data = JSON.parse(onboardingData);
        prefillInfo = {
          name: data.name || "",
          gender: data.gender || "",
          location: data.location || null,
          source: "onboarding",
        };
        setPrefillData(prefillInfo);
        setFormData((prev) => ({
          ...prev,
          name: data.name || prev.name,
          phone: data.phone || prev.phone,
          gender: data.gender || prev.gender,
        }));
      } catch (error) {
        console.error("Error parsing prefill data:", error);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Include location data from onboarding if available
      const onboardingData = localStorage.getItem("userOnboardingData");
      let locationData = null;
      if (onboardingData) {
        try {
          const data = JSON.parse(onboardingData);
          locationData = data.location;
        } catch (e) {
          console.error("Error parsing onboarding location:", e);
        }
      }

      const registrationData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        phoneNumber: formData.phone,
        gender: formData.gender,
        password: formData.password,
        age: formData.age || null,
        dateOfBirth: formData.dateOfBirth || null,
        location: locationData,
      };

      const response = await fetch("/api/auth/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationData),
      });

      if (response.ok) {
        const result = await response.json();

        // Store authentication data
        localStorage.setItem("userToken", result.token);
        localStorage.setItem(
          "authenticatedUserData",
          JSON.stringify(result.user)
        );

        // Clean up temporary data but keep onboarding for location
        localStorage.removeItem("userPrefillData");

        alert("Registration successful! Welcome to TechTrims!");
        router.push("/user/dashboard");
      } else {
        const error = await response.json();
        alert("Registration failed: " + error.message);
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>Create Account</h1>

        {prefillData && (
          <div className={styles.prefillInfo}>
            <h3>Complete your registration</h3>
            <p>
              {prefillData.source === "onboarding"
                ? "Based on your preferences"
                : `From your recent booking${
                    prefillData.lastBooking
                      ? ` on ${prefillData.lastBooking}`
                      : ""
                  }`}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <input
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className={styles.formGroup}>
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div className={styles.formGroup}>
            <input
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              required
            />
          </div>

          <div className={styles.formGroup}>
            <select
              value={formData.gender}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value })
              }
              required
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
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
