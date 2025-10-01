import React, { useState, useEffect } from "react";
import { MapPin, Clock, Store, Scissors, Star } from "lucide-react";
import styles from "../../styles/SalonRegister.module.css";
import dynamic from "next/dynamic";
import Link from "next/link";

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(() => import("../Maps/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-gray-300 h-64 rounded-xl"></div>
  ),
});

const SalonRegisterForm = () => {
  const [formData, setFormData] = useState({
    // Owner Details
    fullName: "",
    phone: "",
    email: "",
    password: "",

    // Salon Details
    salonName: "",
    address: "",
    locationData: null,
    latitude: "",
    longitude: "", // Will store coordinates and formatted address
    openingTime: "09:00",
    closingTime: "21:00",

    // Basic Services & Pricing
    services: {
      haircut: { enabled: false, price: "" },
      shave: { enabled: false, price: "" },
      hairWash: { enabled: false, price: "" },
      hairStyling: { enabled: false, price: "" },
      facial: { enabled: false, price: "" },
      hairColor: { enabled: false, price: "" },
    },
    barbers: [],
    services: {
      haircut: { enabled: false, price: "" },
      shave: { enabled: false, price: "" },
      hairWash: { enabled: false, price: "" },
      hairStyling: { enabled: false, price: "" },
      facial: { enabled: false, price: "" },
      hairColor: { enabled: false, price: "" },
    },
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: prev.latitude || pos.coords.latitude,
          longitude: prev.longitude || pos.coords.longitude,
        }));
      });
    }
  }, []);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const validateStep = (step) => {
    const errors = {};

    if (step === 1) {
      if (!formData.fullName) errors.fullName = "Full name is required";
      if (!formData.phone) errors.phone = "Mobile number is required";
      if (!formData.email) errors.email = "Email is required";
      if (!formData.password) errors.password = "Password is required";
      else if (formData.password.length < 6)
        errors.password = "Password must be at least 6 characters";
    }

    if (step === 2) {
      if (!formData.salonName) errors.salonName = "Salon name is required";
      if (!formData.locationData) {
        errors.location = "Please select a location on the map";
      }
      if (!formData.address) errors.address = "Address is required";
    }

    if (step === 4) {
      const enabledServices = Object.values(formData.services).some(
        (service) => service.enabled
      );
      if (!enabledServices)
        errors.services = "Please enable at least one service";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation error when field is updated
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleServiceChange = (service, field, value) => {
    setFormData((prev) => ({
      ...prev,
      services: {
        ...prev.services,
        [service]: {
          ...prev.services[service],
          [field]: value,
        },
      },
    }));
  };

  // Add barber management functions
  const addBarber = () => {
    setFormData((prev) => ({
      ...prev,
      barbers: [
        ...prev.barbers,
        {
          name: "",
          experience: "",
          skills: [],
          bio: "",
          photo: "",
          isAvailable: true,
          totalBookings: 0,
          rating: 5.0,
        },
      ],
    }));
  };

  const removeBarber = (index) => {
    setFormData((prev) => ({
      ...prev,
      barbers: prev.barbers.filter((_, i) => i !== index),
    }));
  };

  const handleBarberChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      barbers: prev.barbers.map((barber, i) =>
        i === index ? { ...barber, [field]: value } : barber
      ),
    }));
  };

  const handleBarberSkillChange = (index, skill, checked) => {
    setFormData((prev) => ({
      ...prev,
      barbers: prev.barbers.map((barber, i) =>
        i === index
          ? {
              ...barber,
              skills: checked
                ? [...barber.skills, skill]
                : barber.skills.filter((s) => s !== skill),
            }
          : barber
      ),
    }));
  };

  const handleLocationSelect = (locationData) => {
    const lat = locationData.lat ? parseFloat(locationData.lat) : "";
    const lng = locationData.lng ? parseFloat(locationData.lng) : "";

    setFormData((prev) => ({
      ...prev,
      locationData: {
        lat: lat,
        lng: lng,
        address: locationData.address,
      },
      latitude: lat,
      longitude: lng,
      address: locationData.address || prev.address,
    }));
    setShowLocationPicker(false);

    if (validationErrors.location) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.location;
        return newErrors;
      });
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
    if (!validateStep(currentStep)) {
      console.log("Validation failed at step", currentStep, validationErrors);
      return;
    }
    console.log("Form Data at Step", currentStep, formData);
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    const lat = formData.locationData?.lat || parseFloat(formData.latitude);
    const lng = formData.locationData?.lng || parseFloat(formData.longitude);

    try {
      const registrationData = {
        ownerName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        salonName: formData.salonName,
        address: formData.locationData?.address || formData.address,
        latitude: lat,
        longitude: lng,
        coordinates: [lng, lat],
        openingTime: formData.openingTime,
        closingTime: formData.closingTime,
        services: formData.services,
        barbers: formData.barbers,
      };

      // Here you would send data to your backend API
      const response = await fetch("/api/auth/salon/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Registration result:", result);

        // Store salon session with proper structure
        const salonSession = {
          id: result.salon._id || result.salon.id,
          salonName: result.salon.salonName,
          ownerName: result.salon.ownerName,
          email: result.salon.email,
        };

        localStorage.setItem("salonSession", JSON.stringify(salonSession));
        localStorage.setItem("salonToken", result.token);
        // alert("Salon registered successfully! Welcome to the platform.");
        alert(
          `Salon registered successfully! ${
            result.barbersCreated || 0
          } barbers added. Welcome!`
        );

        // Redirect to dashboard or login
        window.location.href = "/auth/salon/login";
      } else {
        const error = await response.json();
        alert(`Registration failed: ${error.message}`);
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed. Please try again.");
    }
  };

  const services = [
    { key: "haircut", label: "Haircut", icon: Scissors, defaultPrice: "200" },
    { key: "shave", label: "Shave", icon: Scissors, defaultPrice: "100" },
    {
      key: "hairWash",
      label: "Hair Wash",
      icon: Scissors,
      defaultPrice: "150",
    },
    {
      key: "hairStyling",
      label: "Hair Styling",
      icon: Scissors,
      defaultPrice: "300",
    },
    { key: "facial", label: "Facial", icon: Star, defaultPrice: "500" },
    {
      key: "hairColor",
      label: "Hair Color",
      icon: Scissors,
      defaultPrice: "800",
    },
  ];

  // Don't render until client-side to avoid hydration issues
  if (!isClient) {
    return (
      <div className="min-h-screen bg-[var(--background-primary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div
      className={styles.container}
      data-theme={isDarkMode ? "dark" : "light"}
    >
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Register Your Salon</h1>
        <p className={styles.headerSubtitle}>
          Join our platform and start getting more customers
        </p>
      </div>

      {/* Progress Steps */}
      <div className={styles.progressSteps}>
        {[1, 2, 3, 4].map((step) => (
          <React.Fragment key={step}>
            <div
              className={styles.stepCircle}
              style={{
                background:
                  currentStep >= step ? "var(--primary)" : "var(--gray-400)",
                color: currentStep >= step ? "var(--black)" : "var(--black)",
              }}
            >
              {step}
            </div>
            {step < 4 && (
              <div
                className={styles.stepLine}
                style={{
                  background:
                    currentStep > step ? "var(--primary)" : "var(--gray-400)",
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Registration Form */}
      <div className={styles.formCard}>
        <div className="space-y-8">
          {/* Step 1: Owner Details */}
          {currentStep === 1 && (
            <div className={styles.stepContainer}>
              <h2 className={styles.stepTitle}>Owner Details</h2>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Full Name</label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={formData.fullName}
                    onChange={(e) =>
                      handleInputChange("fullName", e.target.value)
                    }
                    className={`${styles.formInput} ${
                      validationErrors.fullName ? styles.inputError : ""
                    }`}
                  />
                  {validationErrors.fullName && (
                    <p className={styles.errorText}>
                      {validationErrors.fullName}
                    </p>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className={`${styles.formInput} ${
                      validationErrors.phone ? styles.inputError : ""
                    }`}
                  />
                  {validationErrors.phone && (
                    <p className={styles.errorText}>{validationErrors.phone}</p>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Email</label>
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`${styles.formInput} ${
                      validationErrors.email ? styles.inputError : ""
                    }`}
                  />
                  {validationErrors.email && (
                    <p className={styles.errorText}>{validationErrors.email}</p>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Password</label>
                  <input
                    type="password"
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className={`${styles.formInput} ${
                      validationErrors.password ? styles.inputError : ""
                    }`}
                  />
                  {validationErrors.password && (
                    <p className={styles.errorText}>
                      {validationErrors.password}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Salon Details */}
          {currentStep === 2 && (
            <div className={styles.stepContainer}>
              <h2 className={styles.stepTitle}>
                <Store className="w-6 h-6" />
                Salon Details
              </h2>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Salon Name</label>
                  <input
                    type="text"
                    placeholder="Your salon name"
                    value={formData.salonName}
                    onChange={(e) =>
                      handleInputChange("salonName", e.target.value)
                    }
                    className={`${styles.formInput} ${
                      validationErrors.salonName ? styles.inputError : ""
                    }`}
                  />
                  {validationErrors.salonName && (
                    <p className={styles.errorText}>
                      {validationErrors.salonName}
                    </p>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Location Pin</label>
                  <div className={styles.inputWithIcon}>
                    <MapPin className={styles.inputIcon} />
                    <button
                      type="button"
                      className={`${styles.locationButton} ${
                        validationErrors.location ? styles.inputError : ""
                      }`}
                      onClick={() => setShowLocationPicker(true)}
                    >
                      {formData.locationData
                        ? formData.locationData.address
                        : "Set exact location on map"}
                    </button>
                    {validationErrors.location && (
                      <p className={styles.errorText}>
                        {validationErrors.location}
                      </p>
                    )}
                    {showLocationPicker && (
                      <div className={styles.modalOverlay}>
                        <div className={styles.modalContent}>
                          <button
                            className={styles.modalClose}
                            onClick={() => setShowLocationPicker(false)}
                          >
                            ✕
                          </button>
                          <LocationPicker
                            onLocationSelect={handleLocationSelect}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`${styles.formGroup} ${styles.formGridFull}`}>
                  <label className={styles.formLabel}>Address</label>
                  <textarea
                    placeholder="Complete address with landmarks"
                    value={formData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    rows={3}
                    className={`${styles.textarea} ${
                      validationErrors.address ? styles.inputError : ""
                    }`}
                  />
                  {validationErrors.address && (
                    <p className={styles.errorText}>
                      {validationErrors.address}
                    </p>
                  )}
                </div>
                <input
                  type="hidden"
                  name="latitude"
                  value={formData.latitude || ""}
                />
                <input
                  type="hidden"
                  name="longitude"
                  value={formData.longitude || ""}
                />

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Opening Time</label>
                  <div className={styles.inputWithIcon}>
                    <Clock className={styles.inputIcon} />
                    <input
                      type="time"
                      value={formData.openingTime}
                      onChange={(e) =>
                        handleInputChange("openingTime", e.target.value)
                      }
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Closing Time</label>
                  <div className={styles.inputWithIcon}>
                    <Clock className={styles.inputIcon} />
                    <input
                      type="time"
                      value={formData.closingTime}
                      onChange={(e) =>
                        handleInputChange("closingTime", e.target.value)
                      }
                      className={styles.formInput}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Barber Management */}
          {currentStep === 3 && (
            <div className={styles.stepContainer}>
              <h2 className={styles.stepTitle}>Add Your Barbers</h2>

              <div className="space-y-6">
                {formData.barbers.map((barber, index) => (
                  <div key={index} className={styles.barberCard}>
                    <div className={styles.barberHeader}>
                      <h3 className={styles.barberTitle}>Barber {index + 1}</h3>
                      {formData.barbers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBarber(index)}
                          className={styles.removeButton}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className={styles.barberInputGrid}>
                      <input
                        type="text"
                        placeholder="Barber Name"
                        value={barber.name}
                        onChange={(e) =>
                          handleBarberChange(index, "name", e.target.value)
                        }
                        className={styles.formInput}
                      />

                      <input
                        type="number"
                        placeholder="Years of Experience"
                        value={barber.experience}
                        onChange={(e) =>
                          handleBarberChange(
                            index,
                            "experience",
                            e.target.value
                          )
                        }
                        className={styles.formInput}
                      />
                    </div>

                    <div className="mt-4">
                      <label className={styles.skillsLabel}>
                        Specializations
                      </label>
                      <div className={styles.skillsGrid}>
                        {[
                          "Haircut",
                          "Shaving",
                          "Hair Styling",
                          "Beard Trim",
                          "Hair Color",
                          "Facial",
                        ].map((skill) => (
                          <div key={skill} className={styles.skillCheckbox}>
                            <input
                              type="checkbox"
                              checked={barber.skills.includes(skill)}
                              onChange={(e) =>
                                handleBarberSkillChange(
                                  index,
                                  skill,
                                  e.target.checked
                                )
                              }
                            />
                            <label>{skill}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className={styles.skillsLabel}>
                        Bio/Accomplishments
                      </label>
                      <textarea
                        placeholder="Describe barber's achievements, awards, etc."
                        value={barber.bio}
                        onChange={(e) =>
                          handleBarberChange(index, "bio", e.target.value)
                        }
                        rows={2}
                        className={styles.textarea}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addBarber}
                  className={styles.addBarberButton}
                >
                  + Add Another Barber
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Services */}
          {currentStep === 4 && (
            <div className={styles.stepContainer}>
              <h2 className={styles.stepTitle}>
                <Scissors className="w-6 h-6" />
                Basic Services & Pricing
              </h2>

              {validationErrors.services && (
                <p className={styles.errorText}>{validationErrors.services}</p>
              )}

              <div className={styles.servicesGrid}>
                {services.map((service) => {
                  const Icon = service.icon;
                  return (
                    <div
                      key={service.key}
                      className={`${styles.serviceCard} ${
                        formData.services[service.key].enabled
                          ? styles.active
                          : ""
                      }`}
                    >
                      <div className={styles.serviceHeader}>
                        <div className={styles.serviceCheckbox}>
                          <input
                            type="checkbox"
                            checked={formData.services[service.key].enabled}
                            onChange={(e) =>
                              handleServiceChange(
                                service.key,
                                "enabled",
                                e.target.checked
                              )
                            }
                          />
                          <Icon className={styles.serviceIcon} />
                          <span className={styles.serviceName}>
                            {service.label}
                          </span>
                        </div>
                      </div>

                      {formData.services[service.key].enabled && (
                        <div className={styles.priceInput}>
                          <span className={styles.priceSymbol}>₹</span>
                          <input
                            type="number"
                            placeholder={service.defaultPrice}
                            value={formData.services[service.key].price}
                            onChange={(e) =>
                              handleServiceChange(
                                service.key,
                                "price",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className={styles.navigationButtons}>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className={styles.prevButton}
              >
                Previous
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className={styles.nextButton}
              >
                Next Step
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className={styles.nextButton}
              >
                Register My Salon
              </button>
            )}
          </div>
        </div>

        {/* Sign In Link */}
        <div className={styles.signInSection}>
          <p className={styles.signInText}>
            Already registered?{" "}
            <Link href="/salons/login" className={styles.signInLink}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SalonRegisterForm;
