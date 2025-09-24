import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import styles from "../styles/Onboarding.module.css";

export default function Onboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    location: {
      latitude: null,
      longitude: null,
      address: "",
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState("pending"); // pending, loading, success, error

  useEffect(() => {
    // Check if user has already completed onboarding
    const hasOnboarded = localStorage.getItem("hasOnboarded");
    if (hasOnboarded) {
      router.push("/");
    }
  }, [router]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getCurrentLocation = () => {
    setLocationStatus("loading");

    if (!navigator.geolocation) {
      setLocationStatus("error");
      alert("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Reverse geocoding to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();

          setFormData((prev) => ({
            ...prev,
            location: {
              latitude,
              longitude,
              address: data.display_name || `${latitude}, ${longitude}`,
            },
          }));
          setLocationStatus("success");
        } catch (error) {
          console.error("Error getting address:", error);
          setFormData((prev) => ({
            ...prev,
            location: {
              latitude,
              longitude,
              address: `${latitude}, ${longitude}`,
            },
          }));
          setLocationStatus("success");
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocationStatus("error");
        alert(
          "Unable to get your location. Please enter manually or try again."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000,
      }
    );
  };

  const handleManualLocation = (address) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        latitude: null,
        longitude: null,
        address,
      },
    }));
    setLocationStatus("success");
  };

  const nextStep = () => {
    if (currentStep === 1 && formData.name.trim().length < 2) {
      alert("Please enter a valid name");
      return;
    }
    if (currentStep === 2 && !formData.gender) {
      alert("Please select your gender");
      return;
    }
    if (currentStep === 3 && locationStatus !== "success") {
      alert("Please set your location");
      return;
    }

    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const completeOnboarding = () => {
    setIsLoading(true);

    // Store onboarding data in localStorage
    localStorage.setItem("userOnboardingData", JSON.stringify(formData));
    localStorage.setItem("hasOnboarded", "true");

    setTimeout(() => {
      setIsLoading(false);
      router.push("/");
    }, 1500);
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <div className={styles.container}>
      <div className={styles.background}>
        <div className={styles.goldOrb}></div>
        <div className={styles.goldOrb}></div>
      </div>

      <div className={styles.onboardingCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Welcome to <span className={styles.goldText}>LuxeSalon</span>
          </h1>
          <p className={styles.subtitle}>
            Let&apos;s personalize your experience
          </p>

          <div className={styles.progressBar}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${(currentStep / 3) * 100}%` }}
              ></div>
            </div>
            <span className={styles.progressText}>{currentStep}/3</span>
          </div>
        </div>

        <motion.div
          key={currentStep}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={stepVariants}
          transition={{ duration: 0.3 }}
          className={styles.stepContent}
        >
          {currentStep === 1 && (
            <div className={styles.step}>
              <div className={styles.stepIcon}>👋</div>
              <h2>What&apos;s your name?</h2>
              <p>We&apos;ll use this to personalize your booking experience</p>

              <div className={styles.formGroup}>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={styles.input}
                  autoFocus
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className={styles.step}>
              <div className={styles.stepIcon}>⚧️</div>
              <h2>How do you identify?</h2>
              <p>This helps us show relevant services and pricing</p>

              <div className={styles.genderOptions}>
                {["Male", "Female", "Other"].map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    className={`${styles.genderButton} ${
                      formData.gender === gender ? styles.selected : ""
                    }`}
                    onClick={() => handleInputChange("gender", gender)}
                  >
                    <div className={styles.genderIcon}>
                      {gender === "Male"
                        ? "👨"
                        : gender === "Female"
                        ? "👩"
                        : "🧑"}
                    </div>
                    <span>{gender}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className={styles.step}>
              <div className={styles.stepIcon}>📍</div>
              <h2>Where are you located?</h2>
              <p>We&apos;ll find the best salons near you</p>

              <div className={styles.locationSection}>
                {locationStatus === "pending" && (
                  <>
                    <button
                      type="button"
                      className={styles.locationButton}
                      onClick={getCurrentLocation}
                    >
                      <span>📍</span>
                      Use Current Location
                    </button>

                    <div className={styles.divider}>
                      <span>or</span>
                    </div>

                    <input
                      type="text"
                      placeholder="Enter your area/city manually"
                      className={styles.input}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && e.target.value.trim()) {
                          handleManualLocation(e.target.value.trim());
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          handleManualLocation(e.target.value.trim());
                        }
                      }}
                    />
                  </>
                )}

                {locationStatus === "loading" && (
                  <div className={styles.loadingLocation}>
                    <div className={styles.spinner}></div>
                    <p>Getting your location...</p>
                  </div>
                )}

                {locationStatus === "success" && (
                  <div className={styles.locationSuccess}>
                    <div className={styles.locationIcon}>✅</div>
                    <div>
                      <h4>Location Set!</h4>
                      <p>{formData.location.address}</p>
                    </div>
                    <button
                      type="button"
                      className={styles.changeLocationButton}
                      onClick={() => setLocationStatus("pending")}
                    >
                      Change
                    </button>
                  </div>
                )}

                {locationStatus === "error" && (
                  <div className={styles.locationError}>
                    <p>Couldn&apos;t get location. Please enter manually:</p>
                    <input
                      type="text"
                      placeholder="Enter your area/city"
                      className={styles.input}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && e.target.value.trim()) {
                          handleManualLocation(e.target.value.trim());
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        <div className={styles.navigation}>
          {currentStep > 1 && (
            <button
              type="button"
              className={styles.backButton}
              onClick={prevStep}
            >
              ← Back
            </button>
          )}

          <button
            type="button"
            className={styles.nextButton}
            onClick={nextStep}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className={styles.spinner}></div>
                Setting up...
              </>
            ) : currentStep === 3 ? (
              "Complete Setup"
            ) : (
              "Next →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
