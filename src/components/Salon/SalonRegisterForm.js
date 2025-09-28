import React, { useState, useEffect } from "react";
import { MapPin, Clock, Store, Scissors, Star } from "lucide-react";
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

    if (step === 3) {
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
        // window.location.href = "/salons/dashboard";
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
    { key: "Haircut", label: "Haircut", icon: Scissors, defaultPrice: "200" },
    { key: "Shave", label: "Shave", icon: Scissors, defaultPrice: "100" },
    {
      key: "Hair Wash",
      label: "Hair Wash",
      icon: Scissors,
      defaultPrice: "150",
    },
    {
      key: "Hair Styling",
      label: "Hair Styling",
      icon: Scissors,
      defaultPrice: "300",
    },
    { key: "Facial", label: "Facial", icon: Star, defaultPrice: "500" },
    {
      key: "Hair Color",
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
    <>
      <div
        className={`min-h-screen transition-all duration-500 ${
          isDarkMode
            ? "bg-[var(--dark-background-primary)]"
            : "bg-[var(--background-primary)]"
        }`}
      >
        {/* Dark Mode Toggle */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-3 rounded-full transition-all duration-300 ${
              isDarkMode
                ? "bg-[var(--dark-gold-primary)] text-gray-900 hover:opacity-90"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8 animate-fadeIn">
              <div
                className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                  isDarkMode
                    ? "bg-[var(--dark-gold-primary)]"
                    : "bg-[var(--gold-primary)]"
                }`}
              >
                <Store className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-2 gold-gradient-text">
                Register Your Salon
              </h1>
              <p
                className={`text-lg ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Join our platform and start getting more customers
              </p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
              {[1, 2, 3, 4].map((step) => (
                <React.Fragment key={step}>
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                      currentStep >= step
                        ? isDarkMode
                          ? "bg-[var(--dark-gold-primary)] text-[var(--contrast-dark)]"
                          : "bg-[var(--gold-primary)] text-[var(--contrast-dark)]"
                        : isDarkMode
                        ? "bg-gray-700 text-gray-400"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step}
                  </div>
                  {step < 4 && (
                    <div
                      className={`w-12 h-1 mx-2 transition-all duration-300 ${
                        currentStep > step
                          ? isDarkMode
                            ? "bg-[var(--dark-gold-primary)]"
                            : "bg-[var(--gold-primary)]"
                          : isDarkMode
                          ? "bg-gray-700"
                          : "bg-gray-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Registration Form */}
            <div
              className={`card rounded-3xl   p-8 backdrop-blur-sm transition-all duration-500 ${
                isDarkMode
                  ? "bg-gray-800/80 border border-gray-700"
                  : "bg-white/90 border border-amber-200"
              }`}
            >
              <div className="space-y-8">
                {/* Step 1: Owner Details */}
                {currentStep === 1 && (
                  <div className="animate-slideIn">
                    <h2
                      className={`text-2xl font-bold mb-6 flex items-center ${
                        isDarkMode ? "text-yellow-400" : "text-amber-600"
                      }`}
                    >
                      Owner Details
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label
                          className={`form-label ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="Your full name"
                          value={formData.fullName}
                          onChange={(e) =>
                            handleInputChange("fullName", e.target.value)
                          }
                          className={`w-full form-input rounded-xl transition-all duration-300 focus:ring-2 focus:ring-opacity-50 ${
                            isDarkMode
                              ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                              : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:ring-amber-500"
                          } ${
                            validationErrors.fullName ? "border-red-500" : ""
                          }`}
                        />
                        {validationErrors.fullName && (
                          <p className="text-red-500 text-sm">
                            {validationErrors.fullName}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label
                          className={`form-label ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Mobile Number
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            placeholder="+91 9876543210"
                            value={formData.phone}
                            onChange={(e) =>
                              handleInputChange("phone", e.target.value)
                            }
                            className={`w-full form-input pl-11 pr-4 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-opacity-50 ${
                              isDarkMode
                                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:ring-amber-500"
                            } ${
                              validationErrors.phone ? "border-red-500" : ""
                            }`}
                          />
                        </div>
                        {validationErrors.phone && (
                          <p className="text-red-500 text-sm">
                            {validationErrors.phone}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label
                          className={`form-label ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Email
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            placeholder="your.email@example.com"
                            value={formData.email}
                            onChange={(e) =>
                              handleInputChange("email", e.target.value)
                            }
                            className={`w-full form-input pl-11 pr-4 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-opacity-50 ${
                              isDarkMode
                                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:ring-amber-500"
                            } ${
                              validationErrors.email ? "border-red-500" : ""
                            }`}
                          />
                        </div>
                        {validationErrors.email && (
                          <p className="text-red-500 text-sm">
                            {validationErrors.email}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label
                          className={`form-label ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            placeholder="Create a strong password"
                            value={formData.password}
                            onChange={(e) =>
                              handleInputChange("password", e.target.value)
                            }
                            className={`w-full form-input pl-11 pr-4 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-opacity-50 ${
                              isDarkMode
                                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                                : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:ring-amber-500"
                            } ${
                              validationErrors.password ? "border-red-500" : ""
                            }`}
                          />
                        </div>
                        {validationErrors.password && (
                          <p className="text-red-500 text-sm">
                            {validationErrors.password}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Salon Details */}
                {currentStep === 2 && (
                  <div className="animate-slideIn">
                    <h2
                      className={`text-2xl font-bold mb-6 flex items-center ${
                        isDarkMode ? "text-yellow-400" : "text-amber-600"
                      }`}
                    >
                      <Store className="w-6 h-6 mr-3" />
                      Salon Details
                    </h2>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label
                          className={`form-label ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Salon Name
                        </label>
                        <input
                          type="text"
                          placeholder="Your salon name"
                          value={formData.salonName}
                          onChange={(e) =>
                            handleInputChange("salonName", e.target.value)
                          }
                          className={`w-full form-input rounded-xl transition-all duration-300 focus:ring-2 focus:ring-opacity-50 ${
                            isDarkMode
                              ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                              : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:ring-amber-500"
                          } ${
                            validationErrors.salonName ? "border-red-500" : ""
                          }`}
                        />
                        {validationErrors.salonName && (
                          <p className="text-red-500 text-sm">
                            {validationErrors.salonName}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label
                          className={`form-label ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Location Pin
                        </label>
                        <div className="relative">
                          <MapPin
                            className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          />
                          <button
                            type="button"
                            className={`w-full pl-11 pr-4 py-3 rounded-xl border transition-all duration-300 text-left form-input ${
                              isDarkMode
                                ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                                : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                            } ${
                              validationErrors.location ? "border-red-500" : ""
                            }`}
                            onClick={() => setShowLocationPicker(true)}
                          >
                            {formData.locationData
                              ? formData.locationData.address
                              : "Set exact location on map"}
                          </button>
                          {validationErrors.location && (
                            <p className="text-red-500 text-sm">
                              {validationErrors.location}
                            </p>
                          )}
                          {showLocationPicker && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                              <div className="bg-white rounded-xl p-6 shadow-xl relative w-full max-w-2xl">
                                <button
                                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
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

                      <div className="md:col-span-2 space-y-2">
                        <label
                          className={`form-label ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Address
                        </label>
                        <textarea
                          placeholder="Complete address with landmarks"
                          value={formData.address}
                          onChange={(e) =>
                            handleInputChange("address", e.target.value)
                          }
                          rows={3}
                          className={`w-full form-input rounded-xl transition-all duration-300 resize-none focus:ring-2 focus:ring-opacity-50 ${
                            isDarkMode
                              ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                              : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:ring-amber-500"
                          } ${
                            validationErrors.address ? "border-red-500" : ""
                          }`}
                        />
                        {validationErrors.address && (
                          <p className="text-red-500 text-sm">
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

                      <div className="space-y-2">
                        <label
                          className={`form-label ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Opening Time
                        </label>
                        <div className="relative">
                          <Clock
                            className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          />
                          <input
                            type="time"
                            value={formData.openingTime}
                            onChange={(e) =>
                              handleInputChange("openingTime", e.target.value)
                            }
                            className={`w-full form-input pl-11 pr-4 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-opacity-50 ${
                              isDarkMode
                                ? "bg-gray-700 border-gray-600 text-white focus:border-yellow-500 focus:ring-yellow-500"
                                : "bg-white border-gray-300 text-gray-900 focus:border-amber-500 focus:ring-amber-500"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label
                          className={`form-label ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Closing Time
                        </label>
                        <div className="relative">
                          <Clock
                            className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            }`}
                          />
                          <input
                            type="time"
                            value={formData.closingTime}
                            onChange={(e) =>
                              handleInputChange("closingTime", e.target.value)
                            }
                            className={`w-full form-input pl-11 pr-4 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-opacity-50 ${
                              isDarkMode
                                ? "bg-gray-700 border-gray-600 text-white focus:border-yellow-500 focus:ring-yellow-500"
                                : "bg-white border-gray-300 text-gray-900 focus:border-amber-500 focus:ring-amber-500"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Step 3: Barber Management */}
                {currentStep === 3 && (
                  <div className="animate-slideIn">
                    <h2
                      className={`text-2xl font-bold mb-6 flex items-center ${
                        isDarkMode ? "text-yellow-400" : "text-amber-600"
                      }`}
                    >
                      <div className="w-6 h-6 mr-3" />
                      Add Your Barbers
                    </h2>

                    <div className="space-y-6">
                      {formData.barbers.map((barber, index) => (
                        <div
                          key={index}
                          className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                            isDarkMode
                              ? "border-gray-600 bg-gray-700/50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-4">
                            <h3
                              className={`font-semibold ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              Barber {index + 1}
                            </h3>
                            {formData.barbers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeBarber(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <input
                              type="text"
                              placeholder="Barber Name"
                              value={barber.name}
                              onChange={(e) =>
                                handleBarberChange(
                                  index,
                                  "name",
                                  e.target.value
                                )
                              }
                              className={`w-full px-4 py-3 rounded-xl border transition-all duration-300 focus:ring-2 focus:ring-opacity-50 ${
                                isDarkMode
                                  ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:ring-amber-500"
                              }`}
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
                              className={`w-full px-4 py-3 rounded-xl border transition-all duration-300 focus:ring-2 focus:ring-opacity-50 ${
                                isDarkMode
                                  ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:ring-amber-500"
                              }`}
                            />
                          </div>

                          <div className="mt-4">
                            <label
                              className={`block text-sm font-medium mb-2 ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              Specializations
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {[
                                "Haircut",
                                "Shaving",
                                "Hair Styling",
                                "Beard Trim",
                                "Hair Color",
                                "Facial",
                              ].map((skill) => (
                                <label
                                  key={skill}
                                  className="flex items-center"
                                >
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
                                    className={`mr-2 ${
                                      isDarkMode
                                        ? "text-yellow-500 focus:ring-yellow-500"
                                        : "text-amber-500 focus:ring-amber-500"
                                    }`}
                                  />
                                  <span
                                    className={`text-sm ${
                                      isDarkMode
                                        ? "text-gray-300"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {skill}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="mt-4">
                            <label
                              className={`block text-sm font-medium mb-2 ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              Bio/Accomplishments
                            </label>
                            <textarea
                              placeholder="Describe barber's achievements, awards, etc."
                              value={barber.bio}
                              onChange={(e) =>
                                handleBarberChange(index, "bio", e.target.value)
                              }
                              rows={2}
                              className={`w-full px-4 py-3 rounded-xl border transition-all duration-300 focus:ring-2 focus:ring-opacity-50 resize-none ${
                                isDarkMode
                                  ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:ring-amber-500"
                              }`}
                            />
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addBarber}
                        className={`w-full py-3 border-2 border-dashed rounded-xl transition-all duration-300 ${
                          isDarkMode
                            ? "border-gray-600 text-gray-400 hover:border-yellow-500 hover:text-yellow-400"
                            : "border-gray-300 text-gray-600 hover:border-amber-500 hover:text-amber-600"
                        }`}
                      >
                        + Add Another Barber
                      </button>
                    </div>
                  </div>
                )}
                {/* Step 3: Services */}
                {currentStep === 4 && (
                  <div className="animate-slideIn">
                    <h2
                      className={`text-2xl font-bold mb-6 flex items-center ${
                        isDarkMode ? "text-yellow-400" : "text-amber-600"
                      }`}
                    >
                      <Scissors className="w-6 h-6 mr-3" />
                      Basic Services & Pricing
                    </h2>

                    {validationErrors.services && (
                      <p className="text-red-500 text-sm mb-4">
                        {validationErrors.services}
                      </p>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      {services.map((service) => {
                        const Icon = service.icon;
                        return (
                          <div
                            key={service.key}
                            className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                              formData.services[service.key].enabled
                                ? isDarkMode
                                  ? "border-yellow-500 bg-yellow-500/10"
                                  : "border-amber-500 bg-amber-50"
                                : isDarkMode
                                ? "border-gray-600 bg-gray-700/50 hover:border-gray-500"
                                : "border-gray-200 bg-gray-50 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={
                                    formData.services[service.key].enabled
                                  }
                                  onChange={(e) =>
                                    handleServiceChange(
                                      service.key,
                                      "enabled",
                                      e.target.checked
                                    )
                                  }
                                  className={`w-5 h-5 rounded transition-all duration-300 ${
                                    isDarkMode
                                      ? "text-yellow-500 focus:ring-yellow-500 bg-gray-700 border-gray-600"
                                      : "text-amber-500 focus:ring-amber-500"
                                  }`}
                                />
                                <Icon
                                  className={`w-5 h-5 ml-3 ${
                                    formData.services[service.key].enabled
                                      ? isDarkMode
                                        ? "text-yellow-400"
                                        : "text-amber-600"
                                      : isDarkMode
                                      ? "text-gray-400"
                                      : "text-gray-500"
                                  }`}
                                />
                                <span
                                  className={`ml-2 font-medium ${
                                    formData.services[service.key].enabled
                                      ? isDarkMode
                                        ? "text-white"
                                        : "text-gray-900"
                                      : isDarkMode
                                      ? "text-gray-400"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {service.label}
                                </span>
                              </div>
                            </div>

                            {formData.services[service.key].enabled && (
                              <div className="animate-slideIn">
                                <div className="flex items-center">
                                  <span
                                    className={`text-sm font-medium mr-2 ${
                                      isDarkMode
                                        ? "text-gray-300"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    ₹
                                  </span>
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
                                    className={`flex-1 form-input px-3 py-2 rounded-lg transition-all duration-300 focus:ring-2 focus:ring-opacity-50 ${
                                      isDarkMode
                                        ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
                                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:ring-amber-500"
                                    }`}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-8">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className={`btn btn-secondary`}
                    >
                      Previous
                    </button>
                  )}

                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ml-auto ${
                        isDarkMode
                          ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 hover:from-yellow-400 hover:to-amber-400"
                          : "bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:from-amber-600 hover:to-yellow-700"
                      }`}
                    >
                      Next Step
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ml-auto ${
                        isDarkMode
                          ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 hover:from-yellow-400 hover:to-amber-400"
                          : "bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:from-amber-600 hover:to-yellow-700"
                      }`}
                    >
                      Register My Salon
                    </button>
                  )}
                </div>
              </div>

              {/* Sign In Link */}
              <div className="text-center mt-8 pt-6 border-t border-opacity-20">
                <p
                  className={`${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <Link
                    href="/salons/login"
                    className={`font-medium transition-colors duration-300 ${
                      isDarkMode
                        ? "text-[var(--dark-gold-primary)] hover:opacity-80"
                        : "text-[var(--gold-primary)] hover:opacity-80"
                    }`}
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .animate-fadeIn {
            animation: fadeIn 0.8s ease-out;
          }

          .animate-slideIn {
            animation: slideIn 0.6s ease-out;
          }
        `}</style>
      </div>
    </>
  );
};

export default SalonRegisterForm;
